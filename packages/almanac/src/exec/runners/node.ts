import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ExecOutput } from "../cache.ts";

export interface RunOptions {
	/** Milliseconds before the block is killed. */
	timeoutMs?: number;
	/** Working directory for the block, so relative imports resolve. */
	cwd?: string;
	/** Extra environment for the child. */
	env?: Record<string, string>;
}

const DEFAULT_TIMEOUT_MS = 30_000;

export const NODE_LANGUAGES = new Set([
	"js",
	"javascript",
	"mjs",
	"ts",
	"typescript",
]);

export function isNodeLanguage(language: string): boolean {
	return NODE_LANGUAGES.has(language.toLowerCase());
}

/** Runner identity, so a Node upgrade invalidates cached output. */
export function nodeEngineId(): string {
	return `node:${process.versions.node}`;
}

function extensionFor(language: string): string {
	return language.toLowerCase().startsWith("ts") ? "ts" : "mjs";
}

/**
 * Runs one block in a separate Node process. A subprocess rather than vm or
 * worker_threads so a block that blocks the event loop, exits, or crashes the
 * runtime cannot take the build down with it.
 */
export async function runNode(
	code: string,
	language: string,
	options: RunOptions = {},
): Promise<ExecOutput> {
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const dir = await mkdtemp(path.join(tmpdir(), "almanac-exec-"));
	const file = path.join(dir, `block.${extensionFor(language)}`);
	const started = performance.now();

	try {
		await writeFile(file, code, "utf8");
		const args =
			extensionFor(language) === "ts"
				? ["--experimental-strip-types", "--no-warnings", file]
				: [file];

		return await new Promise<ExecOutput>((resolve) => {
			const child = spawn(process.execPath, args, {
				cwd: options.cwd ?? dir,
				env: { ...process.env, ...options.env, NO_COLOR: "1" },
				stdio: ["ignore", "pipe", "pipe"],
			});

			let stdout = "";
			let stderr = "";
			let settled = false;
			let timedOut = false;

			const timer = setTimeout(() => {
				timedOut = true;
				child.kill("SIGKILL");
			}, timeoutMs);

			child.stdout.on("data", (chunk: Buffer) => {
				stdout += chunk.toString();
			});
			child.stderr.on("data", (chunk: Buffer) => {
				stderr += chunk.toString();
			});

			// The scratch directory is randomly named, so leaving it in a stack
			// trace would make the same block produce different HTML on every
			// machine and defeat the point of a content-addressed cache.
			const scrub = (text: string) =>
				text
					.split(pathToFileURL(dir).href)
					.join("file:///almanac")
					.split(dir)
					.join("/almanac");

			const finish = (error?: string) => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				resolve({
					stdout: scrub(stdout.trimEnd()),
					stderr: scrub(stderr.trimEnd()),
					...(error ? { error: scrub(error) } : {}),
					durationMs: Math.round(performance.now() - started),
				});
			};

			child.on("error", (error) => finish(error.message));
			child.on("close", (exitCode) => {
				if (timedOut) return finish(`timed out after ${timeoutMs}ms`);
				if (exitCode !== 0) return finish(`exited with code ${exitCode}`);
				finish();
			});
		});
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}
