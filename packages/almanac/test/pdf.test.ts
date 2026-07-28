import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MystNode } from "../src/myst/deps.ts";
import { pdfIdFor, toPath } from "../src/myst/processor.ts";
import { PdfQueue } from "../src/pdf/collect.ts";
import { preamble } from "../src/pdf/preamble.ts";
import { stripTags } from "../src/pdf/typst.ts";

describe("preamble", () => {
	it("defines every value myst-to-typst expects a template to supply", () => {
		const source = preamble();
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
		assert.doesNotMatch(preamble(), /@preview/);
		assert.doesNotMatch(preamble(), /#import/);
	});

	it("omits the title block when there is no title", () => {
		assert.doesNotMatch(preamble(), /#align\(center\)/);
	});

	it("renders title, subtitle, and attribution when given them", () => {
		const source = preamble({
			title: "A Page",
			subtitle: "About things",
			author: "Someone",
			source: "https://example.com",
		});
		assert.match(source, /A Page/);
		assert.match(source, /About things/);
		assert.match(source, /Someone \/ https:\/\/example\.com/);
	});

	it("escapes quotes and backslashes so a title cannot break the document", () => {
		const source = preamble({ title: 'He said "hi" \\ there' });
		assert.match(source, /He said \\"hi\\" \\\\ there/);
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
