import { ExecCache, type ExecOutput } from "./cache.ts";
import type { CacheKeyInput } from "./key.ts";
import {
	isNodeLanguage,
	nodeEngineId,
	type RunOptions,
	runNode,
} from "./runners/node.ts";

export { ExecCache, type ExecArtifact, type ExecOutput } from "./cache.ts";
export { CACHE_VERSION, cacheKey, type CacheKeyInput } from "./key.ts";
export { isNodeLanguage, nodeEngineId, runNode } from "./runners/node.ts";

export interface ExecuteRequest {
	code: string;
	language: string;
	/** Skip the cache and always run. */
	fresh?: boolean;
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
			`no runner for "${language}". Almanac currently executes JavaScript and TypeScript; Python and R are planned.`,
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
	if (!isNodeLanguage(language)) throw new UnsupportedLanguageError(language);

	const key: CacheKeyInput = {
		code: request.code,
		language,
		engine: nodeEngineId(),
		dependencies: request.dependencies,
		options: request.run?.timeoutMs
			? { timeoutMs: request.run.timeoutMs }
			: undefined,
	};

	if (!request.fresh) {
		const hit = await cache.get(key);
		if (hit) return { ...hit, cached: true, language };
	}

	const output = await runNode(request.code, language, request.run);
	await cache.set(key, output);
	return { ...output, cached: false, language };
}
