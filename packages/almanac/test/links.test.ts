import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { checkLinks, reportLinks } from "../src/build/links.ts";

let dir: string;

const page = (body: string) => `<html><body>${body}</body></html>`;

before(async () => {
	dir = await mkdtemp(path.join(tmpdir(), "almanac-links-"));
	await mkdir(path.join(dir, "docs", "guide"), { recursive: true });
	await mkdir(path.join(dir, "blog"), { recursive: true });

	await writeFile(
		path.join(dir, "index.html"),
		page(`
			<a href="/docs/guide/">good absolute</a>
			<a href="/docs/guide">good, no trailing slash</a>
			<a href="/nope/">broken</a>
			<a href="https://example.com/missing">external, ignored</a>
			<a href="mailto:someone@example.com">mailto, ignored</a>
			<a href="//cdn.example.com/x">protocol relative, ignored</a>
			<a href="/docs/guide/#section">good anchor</a>
			<a href="/docs/guide/#ghost">broken anchor</a>
		`),
	);
	await writeFile(
		path.join(dir, "docs", "guide", "index.html"),
		page(`
			<h2 id="section">Section</h2>
			<a href="#section">self anchor</a>
			<a href="#missing">broken self anchor</a>
			<a href="../../blog/">relative up and over</a>
			<a href="../../blog/gone/">relative and broken</a>
			<a href="../other/">one level up to a sibling</a>
			<a href="../">one level up to the section index</a>
		`),
	);
	await writeFile(path.join(dir, "docs", "index.html"), page("<p>Docs</p>"));
	await mkdir(path.join(dir, "docs", "other"), { recursive: true });
	await writeFile(
		path.join(dir, "docs", "other", "index.html"),
		page("<p>Other</p>"),
	);
	await writeFile(path.join(dir, "blog", "index.html"), page("<p>Blog</p>"));
});

after(() => {
	// The temp directory is left for the OS to reap; nothing here is large.
});

describe("checkLinks", () => {
	it("finds broken internal links and leaves external ones alone", async () => {
		const broken = await checkLinks(dir, {
			base: "/",
			checkLinks: true,
			checkAnchors: false,
		});
		const hrefs = broken.map((entry) => entry.href).sort();
		assert.deepEqual(hrefs, ["/nope/", "../../blog/gone/"].sort());
	});

	it("resolves a directory URL against itself, not its parent", async () => {
		// "../other/" from /docs/guide/ must land on /docs/other/. Taking the
		// dirname of a slash-terminated path climbs one level too far and
		// reports every working sibling link as broken.
		const broken = await checkLinks(dir, {
			base: "/",
			checkLinks: true,
			checkAnchors: false,
		});
		const hrefs = broken.map((entry) => entry.href);
		assert.ok(!hrefs.includes("../other/"));
		assert.ok(!hrefs.includes("../"));
	});

	it("finds broken anchors, on the same page and across pages", async () => {
		const broken = await checkLinks(dir, {
			base: "/",
			checkLinks: false,
			checkAnchors: true,
		});
		const hrefs = broken.map((entry) => entry.href).sort();
		assert.deepEqual(hrefs, ["#missing", "/docs/guide/#ghost"].sort());
	});

	it("accepts a link to a non-html file that was emitted", async () => {
		const withPdf = await mkdtemp(path.join(tmpdir(), "almanac-pdf-"));
		await mkdir(path.join(withPdf, "pdf"), { recursive: true });
		await writeFile(
			path.join(withPdf, "index.html"),
			page(
				'<a href="/pdf/guide.pdf">download</a><a href="/pdf/gone.pdf">missing</a>',
			),
		);
		await writeFile(path.join(withPdf, "pdf", "guide.pdf"), "%PDF-1.7");

		const broken = await checkLinks(withPdf, {
			base: "/",
			checkLinks: true,
			checkAnchors: false,
		});
		assert.deepEqual(
			broken.map((entry) => entry.href),
			["/pdf/gone.pdf"],
		);
	});

	it("does no work when both checks are off", async () => {
		const broken = await checkLinks(dir, {
			base: "/",
			checkLinks: false,
			checkAnchors: false,
		});
		assert.deepEqual(broken, []);
	});

	it("strips the base prefix before resolving", async () => {
		const based = await mkdtemp(path.join(tmpdir(), "almanac-base-"));
		await mkdir(path.join(based, "docs"), { recursive: true });
		await writeFile(
			path.join(based, "index.html"),
			page('<a href="/almanac/docs/">based link</a>'),
		);
		await writeFile(
			path.join(based, "docs", "index.html"),
			page("<p>Docs</p>"),
		);

		const withBase = await checkLinks(based, {
			base: "/almanac/",
			checkLinks: true,
			checkAnchors: false,
		});
		assert.deepEqual(withBase, []);

		// Without the base, the same href does not resolve, which is what makes
		// the stripping above meaningful rather than incidental.
		const withoutBase = await checkLinks(based, {
			base: "/",
			checkLinks: true,
			checkAnchors: false,
		});
		assert.equal(withoutBase.length, 1);
	});
});

describe("reportLinks", () => {
	const broken = [
		{ from: "/a/", href: "/gone/", kind: "link" as const },
		{ from: "/a/", href: "#ghost", kind: "anchor" as const },
	];

	const collect = () => {
		const messages: string[] = [];
		return {
			messages,
			logger: {
				info: (m: string) => messages.push(`info: ${m}`),
				warn: (m: string) => messages.push(`warn: ${m}`),
			},
		};
	};

	it("throws for throw and reports both categories separately", () => {
		const { logger } = collect();
		assert.throws(
			() => reportLinks(broken, { links: "throw", anchors: "throw" }, logger),
			/broken link[\s\S]*broken anchor/,
		);
	});

	it("warns without throwing for warn", () => {
		const { messages, logger } = collect();
		reportLinks(broken, { links: "warn", anchors: "warn" }, logger);
		assert.equal(messages.length, 2);
		assert.ok(messages.every((m) => m.startsWith("warn:")));
	});

	it("honours a different severity per category", () => {
		const { messages, logger } = collect();
		assert.throws(() =>
			reportLinks(broken, { links: "throw", anchors: "log" }, logger),
		);
		assert.equal(messages.length, 1);
		assert.ok(messages[0]?.startsWith("info:"));
	});

	it("stays silent for ignore", () => {
		const { messages, logger } = collect();
		reportLinks(broken, { links: "ignore", anchors: "ignore" }, logger);
		assert.deepEqual(messages, []);
	});
});
