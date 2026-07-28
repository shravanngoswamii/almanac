import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExecOutput } from "../cache.ts";
import type { RunOptions, Runner } from "./registry.ts";

const DEFAULT_TIMEOUT_MS = 60_000;

/** Marker the driver prints its JSON envelope behind. */
const ENVELOPE = "__ALMANAC_RESULT__";

export const PYTHON_LANGUAGES = new Set(["python", "py"]);

const DRIVER = fileURLToPath(new URL("./pythonDriver.mjs", import.meta.url));

/**
 * Pyodide's version, which pins both the WASM build and the CPython inside it.
 * Read from the installed package rather than by loading Pyodide, because
 * building a cache key must not cost a two second VM start.
 */
export function pythonEngineId(root: string): string {
	try {
		const require = createRequire(path.join(root, "package.json"));
		const manifest = require("pyodide/package.json") as { version?: string };
		return `pyodide-${manifest.version ?? "unknown"}`;
	} catch {
		return "pyodide-missing";
	}
}

export async function runPython(
	code: string,
	options: RunOptions = {},
): Promise<ExecOutput> {
	const root = options.root ?? process.cwd();
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const dir = await mkdtemp(path.join(tmpdir(), "almanac-py-"));
	const file = path.join(dir, "block.py");
	const started = performance.now();

	try {
		await writeFile(file, code, "utf8");

		return await new Promise<ExecOutput>((resolve) => {
			const child = spawn(process.execPath, [DRIVER, root, file], {
				cwd: options.cwd ?? dir,
				env: { ...process.env, ...options.env, NO_COLOR: "1" },
				stdio: ["ignore", "pipe", "pipe"],
			});

			let raw = "";
			let stderr = "";
			let settled = false;
			let timedOut = false;

			const timer = setTimeout(() => {
				timedOut = true;
				child.kill("SIGKILL");
			}, timeoutMs);

			child.stdout.on("data", (chunk: Buffer) => {
				raw += chunk.toString();
			});
			child.stderr.on("data", (chunk: Buffer) => {
				stderr += chunk.toString();
			});

			const finish = (output: ExecOutput) => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				resolve({
					...output,
					durationMs: Math.round(performance.now() - started),
				});
			};

			child.on("error", (error) =>
				finish({
					stdout: "",
					stderr: "",
					error: error.message,
					durationMs: 0,
					transient: true,
				}),
			);

			child.on("close", () => {
				if (timedOut) {
					return finish({
						stdout: "",
						stderr: stderr.trimEnd(),
						error: `timed out after ${timeoutMs}ms`,
						durationMs: 0,
						transient: true,
					});
				}

				const at = raw.lastIndexOf(ENVELOPE);
				if (at === -1) {
					// No envelope means the driver died before it could report,
					// so whatever it wrote is the most useful thing to show.
					return finish({
						stdout: raw.trimEnd(),
						stderr: stderr.trimEnd(),
						error: "python runner produced no result",
						durationMs: 0,
						transient: true,
					});
				}

				try {
					const payload = JSON.parse(raw.slice(at + ENVELOPE.length)) as {
						stdout?: string;
						stderr?: string;
						error?: string;
					};
					finish({
						stdout: (payload.stdout ?? "").trimEnd(),
						stderr: (payload.stderr ?? "").trimEnd(),
						...(payload.error ? { error: payload.error } : {}),
						durationMs: 0,
						// A driver-level failure is the environment's problem, a
						// Python traceback is the code's.
						...(payload.error?.startsWith("python runner failed")
							? { transient: true }
							: {}),
					});
				} catch {
					finish({
						stdout: "",
						stderr: stderr.trimEnd(),
						error: "python runner returned malformed output",
						durationMs: 0,
						transient: true,
					});
				}
			});
		});
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

export const pythonRunner: Runner = {
	id: "pyodide",
	languages: PYTHON_LANGUAGES,
	engineId: (options) => pythonEngineId(options?.root ?? process.cwd()),
	run: (code, _language, options) => runPython(code, options),
};

/** Whether the optional Pyodide peer is installed in the project. */
export async function pythonAvailable(root: string): Promise<boolean> {
	try {
		const require = createRequire(path.join(root, "package.json"));
		const resolved = require.resolve("pyodide/package.json");
		await readFile(resolved, "utf8");
		return true;
	} catch {
		return false;
	}
}
