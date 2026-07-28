import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MystNode } from "../src/myst/deps.ts";
import { pdfIdFor, toPath } from "../src/myst/processor.ts";
import { PdfQueue, bookOrder } from "../src/pdf/collect.ts";
import { preamble } from "../src/pdf/preamble.ts";
import { sidebarOrder } from "../src/utils/sidebar.ts";
import { isProgramOutput, stripTags } from "../src/pdf/typst.ts";

const page = (title?: string) =>
	preamble({ meta: { kind: "page", ...(title ? { title } : {}) }, style: {} });

describe("preamble", () => {
	it("defines every value myst-to-typst expects a template to supply", () => {
		const source = page();
		// Each of these is read by the serializer's output. A missing one fails
		// the compile with "unknown variable", which is how they were found.
		for (const name of [
			"breakableDefault",
			"tableStyle",
			"columnStyle",
			"tablex",
		]) {
			assert.match(source, new RegExp(`#let ${name}`), `${name} is undefined`);
		}
	});

	it("never reaches the typst package registry", () => {
		// An import would make builds depend on the network.
		assert.doesNotMatch(page(), /@preview/);
		assert.doesNotMatch(page(), /#import/);
	});

	it("omits the title block when there is no title", () => {
		assert.doesNotMatch(page(), /#align\(center\)/);
	});

	it("renders title, subtitle, and attribution when given them", () => {
		const source = preamble({
			meta: {
				kind: "page",
				title: "A Page",
				subtitle: "About things",
				author: "Someone",
				source: "https://example.com",
			},
			style: {},
		});
		assert.match(source, /A Page/);
		assert.match(source, /About things/);
		assert.match(source, /Someone \/ https:\/\/example\.com/);
	});

	it("escapes quotes and backslashes so a title cannot break the document", () => {
		const source = page('He said "hi" \\ there');
		assert.match(source, /He said \\"hi\\" \\\\ there/);
	});

	it("exposes the metadata a template can read", () => {
		const source = preamble({
			meta: { kind: "book", title: "Handbook", chapters: ["One", "Two"] },
			style: {},
		});
		assert.match(source, /#let almanac = \(/);
		assert.match(source, /kind: "book"/);
		assert.match(source, /chapters: \("One", "Two",\)/);
	});

	it("honours style options", () => {
		const source = preamble({
			meta: { kind: "page" },
			style: {
				paper: "us-letter",
				bodySize: "12pt",
				accent: "#ff0000",
				bodyFont: ["Georgia"],
			},
		});
		assert.match(source, /paper: "us-letter"/);
		assert.match(source, /size: 12pt/);
		assert.match(source, /rgb\("#ff0000"\)/);
		assert.match(source, /font: \("Georgia"\)/);
	});

	it("replaces the built-in template but keeps the required definitions", () => {
		const source = preamble({
			meta: { kind: "page", title: "Ignored" },
			style: {},
			custom: "#set page(width: 10cm)",
		});
		assert.match(source, /#set page\(width: 10cm\)/);
		// The serializer still needs these, so a custom template cannot lose them.
		assert.match(source, /#let tablex/);
		// The title is still readable as metadata, which is how a template uses
		// it, but the built-in title block and styling are gone.
		assert.match(source, /title: "Ignored"/);
		assert.doesNotMatch(source, /#align\(center\)\[#text\(size: 20pt/);
		assert.doesNotMatch(source, /#set text\(size: 10\.5pt/);
	});

	it("gives a book a cover, an outline, and page numbers", () => {
		const source = preamble({
			meta: { kind: "book", title: "Handbook", subtitle: "All of it" },
			style: {},
			toc: { depth: 3, title: "Table of Contents" },
		});
		assert.match(source, /Handbook/);
		assert.match(source, /All of it/);
		assert.match(source, /#outline\(title: none, depth: 3/);
		assert.match(source, /Table of Contents/);
		assert.match(source, /numbering: "1"/);
		// Body numbering restarts after the front matter.
		assert.match(source, /#counter\(page\)\.update\(1\)/);
		// A book numbers its headings; a page does not.
		assert.match(source, /#set heading\(numbering: "1\.1"\)/);
		assert.doesNotMatch(page(), /#set heading\(numbering/);
	});

	it("can leave the outline out", () => {
		const source = preamble({
			meta: { kind: "book", title: "Handbook" },
			style: {},
			toc: { enabled: false },
		});
		assert.doesNotMatch(source, /#outline/);
	});
});

describe("bookOrder", () => {
	it("follows the configured order, then appends the rest sorted", () => {
		const ordered = bookOrder(
			["guides/b", "index", "guides/a", "reference/z"],
			["index", "guides/a"],
		);
		assert.deepEqual(ordered, ["index", "guides/a", "guides/b", "reference/z"]);
	});

	it("ignores configured ids that have no page", () => {
		assert.deepEqual(bookOrder(["a"], ["missing", "a"]), ["a"]);
	});

	it("sorts everything when no order is given", () => {
		assert.deepEqual(bookOrder(["c", "a", "b"]), ["a", "b", "c"]);
	});
});

describe("sidebarOrder", () => {
	it("flattens groups into reading order", () => {
		const ids = sidebarOrder([
			{ label: "Start", items: ["index", "start/install"] },
			{ label: "Guides", items: [{ doc: "guides/a" }, "guides/b"] },
		]);
		assert.deepEqual(ids, ["index", "start/install", "guides/a", "guides/b"]);
	});

	it("skips autogenerated groups rather than guessing their contents", () => {
		const ids = sidebarOrder([
			"index",
			{ autogenerate: { directory: "guides" } },
		]);
		assert.deepEqual(ids, ["index"]);
	});

	it("returns nothing for no sidebar", () => {
		assert.deepEqual(sidebarOrder(), []);
	});
});

describe("stripTags", () => {
	it("keeps the text of executed output so the pdf shows results", () => {
		const html =
			'<figure class="exec-result"><figcaption>Output<span>3ms</span></figcaption><pre class="exec-stream exec-stdout"><code>42</code></pre></figure>';
		assert.equal(stripTags(html), "42");
	});

	it("decodes the entities the renderer emits", () => {
		assert.equal(
			stripTags("<pre><code>a &lt; b &amp;&amp; c &gt; d</code></pre>"),
			"a < b && c > d",
		);
	});

	it("returns nothing for markup with no text", () => {
		assert.equal(stripTags("<div><span></span></div>"), "");
	});
});

describe("raw html in a pdf", () => {
	it("keeps executed output as output", () => {
		// Program output belongs in a monospace block.
		const html =
			'<figure class="exec-result"><pre class="exec-stream exec-stdout"><code>42</code></pre></figure>';
		assert.equal(stripTags(html), "42");
	});

	it("recognises an output block by its class", () => {
		assert.equal(
			isProgramOutput('<figure class="exec-result">x</figure>'),
			true,
		);
		assert.equal(
			isProgramOutput('<pre class="exec-stream exec-stdout">x</pre>'),
			true,
		);
		assert.equal(isProgramOutput('<img class="exec-artifact" />'), true);
	});

	it("does not mistake a prose callout for output", () => {
		// Setting prose in monospace makes a page look broken, which is what
		// happened before this distinction existed.
		assert.equal(
			isProgramOutput('<div class="callout tip">Worth knowing.</div>'),
			false,
		);
		assert.equal(isProgramOutput("<div><p>Plain prose.</p></div>"), false);
	});
});

describe("pdfIdFor", () => {
	const docs = "/project/docs";

	it("maps a docs file to its collection id", () => {
		assert.equal(
			pdfIdFor("/project/docs/guides/writing.md", docs),
			"guides/writing",
		);
	});

	it("maps the index page", () => {
		assert.equal(pdfIdFor("/project/docs/index.md", docs), "index");
	});

	it("refuses a file outside the docs directory", () => {
		assert.equal(pdfIdFor("/project/blog/post.md", docs), undefined);
	});

	it("strips only the extension, not part of the name", () => {
		assert.equal(pdfIdFor("/project/docs/v1.2.notes.md", docs), "v1.2.notes");
	});
});

describe("toPath", () => {
	it("converts the url astro passes into a filesystem path", () => {
		assert.equal(
			toPath(new URL("file:///project/docs/a.md")),
			"/project/docs/a.md",
		);
	});

	it("passes a plain path through", () => {
		assert.equal(toPath("/project/docs/a.md"), "/project/docs/a.md");
	});

	it("returns undefined when astro gives nothing", () => {
		assert.equal(toPath(undefined), undefined);
	});
});

describe("PdfQueue", () => {
	const tree: MystNode = { type: "root", children: [] };

	it("keeps one entry per page", () => {
		const queue = new PdfQueue();
		queue.add({ id: "a", tree });
		queue.add({ id: "a", tree });
		queue.add({ id: "b", tree });
		assert.equal(queue.size, 2);
	});

	it("starts empty, so a build with nothing queued can say so", () => {
		assert.equal(new PdfQueue().size, 0);
	});
});
