import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ExecOutput } from "../cache.ts";

/** Marker a driver prints its JSON envelope behind. */
export const ENVELOPE = "__ALMANAC_RESULT__";

export interface DriverOptions {
	/** Absolute path to the driver script. */
	driver: string;
	/** Project root, passed to the driver so it can resolve its runtime. */
	root: string;
	code: string;
	/** File extension for the written block, for the driver's benefit. */
	extension: string;
	/** Prefix for the scratch directory, only visible in error paths. */
	prefix: string;
	/** Name used in messages, e.g. "python". */
	label: string;
	timeoutMs: number;
	cwd?: string;
	env?: Record<string, string>;
}

interface Envelope {
	stdout?: string;
	stderr?: string;
	error?: string;
}

/**
 * Runs a block through a driver script in a child process and reads back its
 * envelope.
 *
 * Shared by every WASM runtime, because they all need the same three things: a
 * process that can be killed, a runtime resolved against the consuming project,
 * and a way to return output that cannot be confused with what the block itself
 * printed.
 */
export async function runViaDriver(
	options: DriverOptions,
): Promise<ExecOutput> {
	const dir = await mkdtemp(path.join(tmpdir(), options.prefix));
	const file = path.join(dir, `block.${options.extension}`);
	const started = performance.now();

	try {
		await writeFile(file, options.code, "utf8");

		return await new Promise<ExecOutput>((resolve) => {
			const child = spawn(
				process.execPath,
				[options.driver, options.root, file],
				{
					cwd: options.cwd ?? dir,
					env: { ...process.env, ...options.env, NO_COLOR: "1" },
					stdio: ["ignore", "pipe", "pipe"],
				},
			);

			let raw = "";
			let stderr = "";
			let settled = false;
			let timedOut = false;

			const timer = setTimeout(() => {
				timedOut = true;
				child.kill("SIGKILL");
			}, options.timeoutMs);

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
						error: `timed out after ${options.timeoutMs}ms`,
						durationMs: 0,
						transient: true,
					});
				}

				const at = raw.lastIndexOf(ENVELOPE);
				if (at === -1) {
					// No envelope means the driver died before it could report, so
					// whatever it managed to write is the most useful thing to show.
					return finish({
						stdout: raw.trimEnd(),
						stderr: stderr.trimEnd(),
						error: `${options.label} runner produced no result`,
						durationMs: 0,
						transient: true,
					});
				}

				try {
					const payload = JSON.parse(
						raw.slice(at + ENVELOPE.length),
					) as Envelope;
					finish({
						stdout: (payload.stdout ?? "").trimEnd(),
						stderr: (payload.stderr ?? "").trimEnd(),
						...(payload.error ? { error: payload.error } : {}),
						durationMs: 0,
						// A driver-level failure is the environment's problem; an
						// error from the language itself is the code's.
						...(payload.error?.startsWith(`${options.label} runner failed`)
							? { transient: true }
							: {}),
					});
				} catch {
					finish({
						stdout: "",
						stderr: stderr.trimEnd(),
						error: `${options.label} runner returned malformed output`,
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

/**
 * The installed version of an optional runtime package.
 *
 * Resolved by walking up from the package's entry point rather than requiring
 * `<name>/package.json`, because a package with an `exports` map need not expose
 * its manifest, and webr does not.
 */
export function packageVersion(root: string, name: string): string | undefined {
	try {
		const require = createRequire(path.join(root, "package.json"));
		let dir = path.dirname(require.resolve(name));
		for (let depth = 0; depth < 6; depth += 1) {
			const manifest = path.join(dir, "package.json");
			if (existsSync(manifest)) {
				const parsed = JSON.parse(readFileSync(manifest, "utf8")) as {
					name?: string;
					version?: string;
				};
				if (parsed.name === name) return parsed.version;
			}
			const parent = path.dirname(dir);
			if (parent === dir) break;
			dir = parent;
		}
	} catch {
		return undefined;
	}
	return undefined;
}

/** Whether an optional runtime package can be resolved from the project. */
export function packageInstalled(root: string, name: string): boolean {
	try {
		createRequire(path.join(root, "package.json")).resolve(name);
		return true;
	} catch {
		return false;
	}
}
