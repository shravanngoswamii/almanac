import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { ExecCache } from "../src/exec/cache.ts";
import { cacheKey } from "../src/exec/key.ts";
import {
	execute,
	isNodeLanguage,
	nodeEngineId,
	runNode,
	UnsupportedLanguageError,
} from "../src/exec/index.ts";

describe("cacheKey", () => {
	const base = { code: "console.log(1)", language: "js", engine: "node:24" };

	it("is stable across calls", () => {
		assert.equal(cacheKey(base), cacheKey(base));
	});

	it("ignores dependency key order", () => {
		const a = cacheKey({ ...base, dependencies: { x: "1", y: "2" } });
		const b = cacheKey({ ...base, dependencies: { y: "2", x: "1" } });
		assert.equal(a, b);
	});

	it("changes when the code changes", () => {
		assert.notEqual(
			cacheKey(base),
			cacheKey({ ...base, code: "console.log(2)" }),
		);
	});

	it("changes when the engine changes, so a runtime upgrade invalidates", () => {
		assert.notEqual(cacheKey(base), cacheKey({ ...base, engine: "node:26" }));
	});

	it("changes when a dependency version changes", () => {
		const a = cacheKey({ ...base, dependencies: { lib: "1.0.0" } });
		const b = cacheKey({ ...base, dependencies: { lib: "1.0.1" } });
		assert.notEqual(a, b);
	});

	it("distinguishes an absent option from an explicit one", () => {
		const a = cacheKey(base);
		const b = cacheKey({ ...base, options: { timeoutMs: 5 } });
		assert.notEqual(a, b);
	});

	it("treats undefined option values as absent", () => {
		const a = cacheKey({ ...base, options: {} });
		const b = cacheKey({ ...base, options: { nope: undefined } });
		assert.equal(a, b);
	});

	it("produces a filesystem-safe key", () => {
		assert.match(cacheKey(base), /^[0-9a-f]{32}$/);
	});
});

describe("ExecCache", () => {
	let dir: string;
	let cache: ExecCache;

	before(async () => {
		dir = await mkdtemp(path.join(tmpdir(), "almanac-cache-test-"));
		cache = new ExecCache(dir);
	});

	after(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	const key = { code: "1+1", language: "js", engine: "node:24" };
	const output = { stdout: "2", stderr: "", durationMs: 5 };

	it("misses on an empty cache", async () => {
		assert.equal(await cache.get(key), undefined);
		assert.equal(cache.stats.misses, 1);
	});

	it("round-trips a stored result", async () => {
		await cache.set(key, output);
		const hit = await cache.get(key);
		assert.deepEqual(hit, output);
		assert.equal(cache.stats.hits, 1);
	});

	it("does not leak internal fields into the result", async () => {
		const hit = await cache.get(key);
		assert.ok(hit);
		assert.equal("key" in hit, false);
		assert.equal("storedAt" in hit, false);
	});

	it("misses for different code", async () => {
		assert.equal(await cache.get({ ...key, code: "2+2" }), undefined);
	});

	it("counts stored entries", async () => {
		assert.equal(await cache.size(), 1);
	});

	it("clears everything", async () => {
		await cache.clear();
		assert.equal(await cache.size(), 0);
		assert.equal(await cache.get(key), undefined);
	});
});

describe("isNodeLanguage", () => {
	it("accepts the javascript and typescript spellings", () => {
		for (const lang of [
			"js",
			"javascript",
			"mjs",
			"ts",
			"typescript",
			"TS",
			"JS",
		]) {
			assert.equal(isNodeLanguage(lang), true, lang);
		}
	});

	it("rejects languages without a runner yet", () => {
		for (const lang of ["python", "r", "julia", "bash", "css"]) {
			assert.equal(isNodeLanguage(lang), false, lang);
		}
	});
});

describe("runNode", () => {
	it("captures stdout", async () => {
		const result = await runNode("console.log('hello')", "js");
		assert.equal(result.stdout, "hello");
		assert.equal(result.error, undefined);
	});

	it("captures stderr without treating it as failure", async () => {
		const result = await runNode("console.error('warn')", "js");
		assert.equal(result.stderr, "warn");
		assert.equal(result.error, undefined);
	});

	it("reports a thrown error as data rather than throwing", async () => {
		const result = await runNode("throw new Error('boom')", "js");
		assert.ok(result.error, "expected an error field");
		assert.match(result.stderr, /boom/);
	});

	it("runs typescript by stripping types", async () => {
		const result = await runNode(
			"const n: number = 21;\nconsole.log(n * 2);",
			"ts",
		);
		assert.equal(result.stdout, "42");
		assert.equal(result.error, undefined);
	});

	it("kills a block that runs too long", async () => {
		const result = await runNode("while (true) {}", "js", { timeoutMs: 300 });
		assert.match(result.error ?? "", /timed out/);
	});

	it("reports a duration", async () => {
		const result = await runNode("console.log(1)", "js");
		assert.ok(result.durationMs >= 0);
	});

	it("supports top-level await", async () => {
		const result = await runNode(
			"await new Promise((r) => setTimeout(r, 10));\nconsole.log('done');",
			"js",
		);
		assert.equal(result.stdout, "done");
	});
});

describe("execute", () => {
	let dir: string;
	let cache: ExecCache;

	before(async () => {
		dir = await mkdtemp(path.join(tmpdir(), "almanac-exec-test-"));
		cache = new ExecCache(dir);
	});

	after(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it("runs on a miss and reuses the result on a hit", async () => {
		const request = { code: "console.log('once')", language: "js" };
		const first = await execute(request, cache);
		assert.equal(first.cached, false);
		assert.equal(first.stdout, "once");

		const second = await execute(request, cache);
		assert.equal(second.cached, true, "the second run must come from cache");
		assert.equal(second.stdout, "once");
	});

	it("re-runs when asked for a fresh result", async () => {
		const request = { code: "console.log('fresh')", language: "js" };
		await execute(request, cache);
		const again = await execute({ ...request, fresh: true }, cache);
		assert.equal(again.cached, false);
	});

	it("treats a dependency change as a different block", async () => {
		const code = "console.log('dep')";
		const a = await execute(
			{ code, language: "js", dependencies: { l: "1" } },
			cache,
		);
		const b = await execute(
			{ code, language: "js", dependencies: { l: "2" } },
			cache,
		);
		assert.equal(a.cached, false);
		assert.equal(
			b.cached,
			false,
			"a new dependency version must not hit the cache",
		);
	});

	it("refuses a language it has no runner for", async () => {
		await assert.rejects(
			() => execute({ code: "print(1)", language: "python" }, cache),
			UnsupportedLanguageError,
		);
	});

	it("names the engine so a runtime upgrade is visible in the key", () => {
		assert.match(nodeEngineId(), /^node:\d+\./);
	});
});
