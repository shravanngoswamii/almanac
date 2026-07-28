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
	rAvailable,
	rEngineId,
	runR,
	nodeEngineId,
	pythonAvailable,
	pythonEngineId,
	runNode,
	runPython,
	runnerFor,
	supportedLanguages,
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

	it("keeps the scratch directory out of stack traces", async () => {
		// Two runs use different temp directories, so identical code must still
		// produce byte-identical output or the cache would be machine-specific.
		const [first, second] = await Promise.all([
			runNode("throw new Error('boom')", "js"),
			runNode("throw new Error('boom')", "js"),
		]);
		assert.equal(first.stderr, second.stderr);
		assert.doesNotMatch(first.stderr, /almanac-exec-/);
		assert.match(first.stderr, /boom/);
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
			() => execute({ code: "SELECT 1", language: "sql" }, cache),
			UnsupportedLanguageError,
		);
	});

	it("names the languages it does run, so the message stays true", async () => {
		let message = "";
		try {
			await execute({ code: "x", language: "sql" }, cache);
		} catch (thrown) {
			message = (thrown as Error).message;
		}
		assert.match(message, /js/);
		assert.match(message, /python/);
	});

	it("names the engine so a runtime upgrade is visible in the key", () => {
		assert.match(nodeEngineId(), /^node:\d+\./);
	});
});

describe("runner registry", () => {
	it("claims python and its alias", () => {
		assert.equal(runnerFor("python")?.id, "pyodide");
		assert.equal(runnerFor("py")?.id, "pyodide");
	});

	it("claims r", () => {
		assert.equal(runnerFor("r")?.id, "webr");
	});

	it("still claims javascript and typescript", () => {
		assert.equal(runnerFor("js")?.id, "node");
		assert.equal(runnerFor("ts")?.id, "node");
	});

	it("is case insensitive, since a fence may say Python", () => {
		assert.equal(runnerFor("Python")?.id, "pyodide");
	});

	it("returns nothing for a language nobody claims", () => {
		assert.equal(runnerFor("sql"), undefined);
	});

	it("reports the languages it can run", () => {
		const languages = supportedLanguages();
		assert.ok(languages.includes("python"));
		assert.ok(languages.includes("ts"));
	});
});

describe("runPython", () => {
	const root = process.cwd();

	it("runs real python and captures stdout", async () => {
		const result = await runPython(
			"import sys\nprint('py', sys.version_info.major)",
			{ root },
		);
		assert.equal(result.error, undefined);
		assert.match(result.stdout, /^py 3$/);
	});

	it("returns a traceback as data rather than throwing", async () => {
		const result = await runPython("1 / 0", { root });
		assert.match(result.error ?? "", /ZeroDivisionError/);
	});

	it("does not cache a traceback as transient, the code really is broken", async () => {
		const result = await runPython("raise ValueError('nope')", { root });
		assert.match(result.error ?? "", /ValueError/);
		assert.notEqual(result.transient, true);
	});

	it("kills a runaway block and marks the timeout transient", async () => {
		const result = await runPython("while True:\n    pass", {
			root,
			timeoutMs: 2000,
		});
		assert.match(result.error ?? "", /timed out after 2000ms/);
		assert.equal(result.transient, true);
	});

	it("names pyodide in the engine id so an upgrade invalidates the cache", () => {
		assert.match(pythonEngineId(root), /^pyodide-\d/);
	});

	it("reports the runtime as available when the peer is installed", async () => {
		assert.equal(await pythonAvailable(root), true);
	});
});

describe("transient results", () => {
	it("are not written to the cache", async () => {
		const dir = await mkdtemp(path.join(tmpdir(), "almanac-transient-"));
		const transientCache = new ExecCache(dir);

		// A timeout is the cheapest reliably transient failure to produce.
		const first = await execute(
			{ code: "while (true) {}", language: "js", run: { timeoutMs: 400 } },
			transientCache,
		);
		assert.equal(first.transient, true);
		assert.equal(first.cached, false);

		const second = await execute(
			{ code: "while (true) {}", language: "js", run: { timeoutMs: 400 } },
			transientCache,
		);
		assert.equal(
			second.cached,
			false,
			"a transient failure must not be served from the cache",
		);
	});
});

describe("runR", () => {
	const root = process.cwd();

	it("runs real r and captures both streams", async () => {
		const result = await runR("cat('sum:', sum(1:10), '\n')\nprint(2L + 2L)", {
			root,
		});
		assert.equal(result.error, undefined);
		assert.match(result.stdout, /sum: 55/);
		assert.match(result.stdout, /\[1\] 4/);
	});

	it("marks a stop() as an error, not just output", async () => {
		// R writes errors to stderr rather than raising, so without recognising
		// them the block would render as a success that happens to print an error.
		const result = await runR("stop('deliberate failure')", { root });
		assert.match(result.error ?? "", /deliberate failure/);
		assert.notEqual(result.transient, true);
	});

	it("keeps a warning as a warning rather than a failure", async () => {
		const result = await runR("warning('careful')\ncat('after\n')", { root });
		assert.equal(result.error, undefined);
		assert.match(result.stderr, /careful/);
		assert.match(result.stdout, /after/);
	});

	it("kills a runaway block and marks the timeout transient", async () => {
		const result = await runR("while (TRUE) {}", { root, timeoutMs: 3000 });
		assert.match(result.error ?? "", /timed out after 3000ms/);
		assert.equal(result.transient, true);
	});

	it("names webr in the engine id", () => {
		assert.match(rEngineId(root), /^webr-\d/);
	});

	it("reports the runtime as available when the peer is installed", () => {
		assert.equal(rAvailable(root), true);
	});
});
