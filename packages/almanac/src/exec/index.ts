import type { ExecCache, ExecOutput } from "./cache.ts";
import type { CacheKeyInput } from "./key.ts";
import { nodeRunner } from "./runners/node.ts";
import { pythonRunner } from "./runners/python.ts";
import { jupyterRunner } from "./runners/jupyter.ts";
import { rRunner } from "./runners/r.ts";
import {
	registerRunner,
	type RunOptions,
	runnerFor,
	supportedLanguages,
} from "./runners/registry.ts";

export { type ExecArtifact, ExecCache, type ExecOutput } from "./cache.ts";
export { CACHE_VERSION, type CacheKeyInput, cacheKey } from "./key.ts";
export { isNodeLanguage, nodeEngineId, runNode } from "./runners/node.ts";
export {
	PYTHON_LANGUAGES,
	pythonAvailable,
	pythonEngineId,
	runPython,
} from "./runners/python.ts";
export { R_LANGUAGES, rAvailable, rEngineId, runR } from "./runners/r.ts";
export {
	jupyterAvailable,
	jupyterServer,
	runJupyter,
	stripAnsi,
} from "./runners/jupyter.ts";
export {
	clearRunners,
	registerRunner,
	type Runner,
	type RunOptions,
	runnerFor,
	supportedLanguages,
} from "./runners/registry.ts";

// Registered at import time so the set of languages is the same everywhere,
// including in the config validation that reports what a project can run.
registerRunner(nodeRunner);
registerRunner(pythonRunner);
registerRunner(rRunner);

export interface ExecuteRequest {
	code: string;
	language: string;
	/** Skip the cache and always run. */
	fresh?: boolean;
	/**
	 * Kernel spec name. Naming one routes the block to a Jupyter server rather
	 * than a local runtime, whatever the language is.
	 */
	kernel?: string;
	dependencies?: Record<string, string>;
	run?: RunOptions;
}

export interface ExecuteResult extends ExecOutput {
	cached: boolean;
	language: string;
}

export class UnsupportedLanguageError extends Error {
	// Declared and assigned separately: a TypeScript parameter property is not
	// valid in Node's type-stripping mode, and this package runs from source.
	readonly language: string;

	constructor(language: string) {
		super(
			`no runner for "${language}". Almanac executes ${supportedLanguages().join(", ")}.`,
		);
		this.name = "UnsupportedLanguageError";
		this.language = language;
	}
}

/**
 * Executes a block, reusing a cached result when the code, language, engine,
 * and declared dependencies all match. Errors inside the block are returned as
 * data rather than thrown, so one broken example cannot fail a whole build.
 */
export async function execute(
	request: ExecuteRequest,
	cache: ExecCache,
): Promise<ExecuteResult> {
	const language = request.language.toLowerCase();
	// A named kernel wins over the language: it is the reader asking for a
	// specific runtime, which is more specific than "this is Python".
	const runner = request.kernel ? jupyterRunner : runnerFor(language);
	if (!runner) throw new UnsupportedLanguageError(language);

	const runOptions = request.kernel
		? { ...request.run, kernel: request.kernel }
		: request.run;

	const key: CacheKeyInput = {
		code: request.code,
		language,
		engine: await runner.engineId(runOptions),
		dependencies: request.dependencies,
		options: {
			...(request.run?.timeoutMs ? { timeoutMs: request.run.timeoutMs } : {}),
			...(request.kernel ? { kernel: request.kernel } : {}),
		},
	};

	if (!request.fresh) {
		const hit = await cache.get(key);
		if (hit) return { ...hit, cached: true, language };
	}

	const output = await runner.run(request.code, language, runOptions);
	if (!output.transient) await cache.set(key, output);
	return { ...output, cached: false, language };
}
