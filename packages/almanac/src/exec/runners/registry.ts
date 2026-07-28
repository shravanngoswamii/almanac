import type { ExecOutput } from "../cache.ts";

export interface RunOptions {
	timeoutMs?: number;
	cwd?: string;
	env?: Record<string, string>;
	/** Project root, used to resolve optional runtime packages. */
	root?: string;
}

export interface Runner {
	/** Stable name, used in messages. */
	id: string;
	/** Lowercased language ids and aliases this runner claims. */
	languages: Set<string>;
	/**
	 * Identifies the runtime in the cache key. Anything that can change output
	 * belongs in here, because a cached result that outlives the runtime that
	 * produced it is worse than no cache at all.
	 */
	engineId(options?: RunOptions): Promise<string> | string;
	run(
		code: string,
		language: string,
		options?: RunOptions,
	): Promise<ExecOutput>;
}

const runners: Runner[] = [];

export function registerRunner(runner: Runner): void {
	runners.push(runner);
}

export function runnerFor(language: string): Runner | undefined {
	return runners.find((runner) => runner.languages.has(language.toLowerCase()));
}

/** Every language any registered runner claims, sorted for stable messages. */
export function supportedLanguages(): string[] {
	return [
		...new Set(runners.flatMap((runner) => [...runner.languages])),
	].sort();
}

/** Test seam: drop all registrations. */
export function clearRunners(): void {
	runners.length = 0;
}
