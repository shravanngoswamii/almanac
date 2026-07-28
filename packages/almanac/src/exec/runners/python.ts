import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExecOutput } from "../cache.ts";
import { packageInstalled, packageVersion, runViaDriver } from "./driver.ts";
import type { RunOptions, Runner } from "./registry.ts";

const DEFAULT_TIMEOUT_MS = 60_000;

export const PYTHON_LANGUAGES = new Set(["python", "py"]);

const DRIVER = fileURLToPath(new URL("./pythonDriver.mjs", import.meta.url));

/**
 * Pyodide's version, which pins both the WASM build and the CPython inside it.
 * Read from the installed package rather than by loading Pyodide, because
 * building a cache key must not cost a two second VM start.
 */
export function pythonEngineId(root: string): string {
	return `pyodide-${packageVersion(root, "pyodide") ?? "unknown"}`;
}

export async function runPython(
	code: string,
	options: RunOptions = {},
): Promise<ExecOutput> {
	return runViaDriver({
		driver: DRIVER,
		root: options.root ?? process.cwd(),
		code,
		extension: "py",
		prefix: "almanac-py-",
		label: "python",
		timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
		cwd: options.cwd,
		env: options.env,
	});
}

export const pythonRunner: Runner = {
	id: "pyodide",
	languages: PYTHON_LANGUAGES,
	engineId: (options) => pythonEngineId(options?.root ?? process.cwd()),
	run: (code, _language, options) => runPython(code, options),
};

/** Whether the optional Pyodide peer is installed in the project. */
export function pythonAvailable(root: string): boolean {
	return packageInstalled(root, "pyodide");
}
