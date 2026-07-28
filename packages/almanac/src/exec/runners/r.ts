import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExecOutput } from "../cache.ts";
import { packageInstalled, packageVersion, runViaDriver } from "./driver.ts";
import type { RunOptions, Runner } from "./registry.ts";

// WebR starts faster than Pyodide but still measurably, so the default is
// generous enough that a first run does not look like a hang.
const DEFAULT_TIMEOUT_MS = 60_000;

export const R_LANGUAGES = new Set(["r"]);

const DRIVER = fileURLToPath(new URL("./rDriver.mjs", import.meta.url));

/** WebR's version, which pins the WASM build and the R inside it. */
export function rEngineId(root: string): string {
	return `webr-${packageVersion(root, "webr") ?? "unknown"}`;
}

export async function runR(
	code: string,
	options: RunOptions = {},
): Promise<ExecOutput> {
	return runViaDriver({
		driver: DRIVER,
		root: options.root ?? process.cwd(),
		code,
		extension: "R",
		prefix: "almanac-r-",
		label: "r",
		timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
		cwd: options.cwd,
		env: options.env,
	});
}

export const rRunner: Runner = {
	id: "webr",
	languages: R_LANGUAGES,
	engineId: (options) => rEngineId(options?.root ?? process.cwd()),
	run: (code, _language, options) => runR(code, options),
};

/** Whether the optional WebR peer is installed in the project. */
export function rAvailable(root: string): boolean {
	return packageInstalled(root, "webr");
}
