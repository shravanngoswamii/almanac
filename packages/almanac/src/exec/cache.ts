import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { cacheKey, type CacheKeyInput } from "./key.ts";

export interface ExecOutput {
	/** Anything the block wrote to stdout. */
	stdout: string;
	/** Anything the block wrote to stderr. */
	stderr: string;
	/** Present when the block threw or exited non-zero. */
	error?: string;
	/** Wall-clock duration of the run, in milliseconds. */
	durationMs: number;
	/** Structured results a runner chose to emit, such as a figure or table. */
	artifacts?: ExecArtifact[];
	/**
	 * Set when the failure is the environment's fault rather than the code's: a
	 * runtime that is not installed, a driver that died, a timeout that a loaded
	 * machine may not repeat. These are never cached, because caching one would
	 * bake a temporary problem into the build until someone thought to clear the
	 * cache directory.
	 */
	transient?: boolean;
}

export interface ExecArtifact {
	kind: "text" | "html" | "png" | "svg" | "json";
	/** Inline payload. Binary kinds are base64. */
	data: string;
	label?: string;
}

interface CacheEntry extends ExecOutput {
	key: string;
	/** ISO timestamp, for pruning and debugging only. Never part of the key. */
	storedAt: string;
}

/**
 * A file-backed cache of execution results. Durable on purpose: builds in CI
 * and on a laptop should reuse the same artifacts, and a cache miss should be
 * the only thing that costs time.
 */
export class ExecCache {
	readonly #dir: string;
	#hits = 0;
	#misses = 0;

	constructor(dir: string) {
		this.#dir = dir;
	}

	get stats(): { hits: number; misses: number } {
		return { hits: this.#hits, misses: this.#misses };
	}

	#pathFor(key: string): string {
		// Shard by the first two characters so a large site does not put
		// thousands of files in one directory.
		return path.join(this.#dir, key.slice(0, 2), `${key}.json`);
	}

	async get(input: CacheKeyInput): Promise<ExecOutput | undefined> {
		const key = cacheKey(input);
		try {
			const raw = await readFile(this.#pathFor(key), "utf8");
			const entry = JSON.parse(raw) as CacheEntry;
			// A key collision or a hand-edited file should miss, not corrupt output.
			if (entry.key !== key) {
				this.#misses += 1;
				return undefined;
			}
			this.#hits += 1;
			const { key: _key, storedAt: _storedAt, ...output } = entry;
			return output;
		} catch {
			this.#misses += 1;
			return undefined;
		}
	}

	async set(input: CacheKeyInput, output: ExecOutput): Promise<void> {
		const key = cacheKey(input);
		const file = this.#pathFor(key);
		await mkdir(path.dirname(file), { recursive: true });
		const entry: CacheEntry = {
			...output,
			key,
			storedAt: new Date().toISOString(),
		};
		await writeFile(file, `${JSON.stringify(entry, null, "\t")}\n`);
	}

	async clear(): Promise<void> {
		await rm(this.#dir, { recursive: true, force: true });
		this.#hits = 0;
		this.#misses = 0;
	}

	/** Number of stored entries, for reporting after a build. */
	async size(): Promise<number> {
		try {
			const shards = await readdir(this.#dir, { withFileTypes: true });
			let total = 0;
			for (const shard of shards) {
				if (!shard.isDirectory()) continue;
				const files = await readdir(path.join(this.#dir, shard.name));
				total += files.filter((f) => f.endsWith(".json")).length;
			}
			return total;
		} catch {
			return 0;
		}
	}
}
