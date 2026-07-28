import { createHash } from "node:crypto";

/**
 * Everything that can change the output of a code block. Any field added here
 * invalidates every existing cache entry, which is the intended behaviour: a
 * stale result is worse than a rebuild.
 */
export interface CacheKeyInput {
	/** The exact source text of the block. */
	code: string;
	/** Language tag from the fence, normalized. */
	language: string;
	/** Runner identity plus its version, e.g. "node:24.15.0". */
	engine: string;
	/** Declared dependencies, as name to resolved version. */
	dependencies?: Record<string, string>;
	/** Options that alter execution or presentation of the result. */
	options?: Record<string, unknown>;
}

/** Stable stringify: object key order must never affect the hash. */
function canonical(value: unknown): string {
	if (value === null || typeof value !== "object")
		return JSON.stringify(value) ?? "null";
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
	const entries = Object.entries(value as Record<string, unknown>)
		.filter(([, v]) => v !== undefined)
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`);
	return `{${entries.join(",")}}`;
}

export const CACHE_VERSION = 2;

/**
 * Content-addressed key for one execution. Deliberately includes a version so
 * a change in how results are stored can invalidate everything at once.
 */
export function cacheKey(input: CacheKeyInput): string {
	const payload = canonical({
		v: CACHE_VERSION,
		code: input.code,
		language: input.language,
		engine: input.engine,
		dependencies: input.dependencies ?? {},
		options: input.options ?? {},
	});
	return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}
