import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	applyTargetIds,
	collectHeadings,
	collectImages,
	dropEmptyOutputs,
	fixCaptionNumbers,
	labelUnresolvedLinks,
	textOf,
	walk,
} from "../src/myst/ast.ts";
import type { MystNode } from "../src/myst/deps.ts";
import { fenceInfo, findExecutable } from "../src/myst/exec.ts";
import { rehypeAstroImages } from "../src/myst/images.ts";

const heading = (depth: number, text: string, id?: string): MystNode => ({
	type: "heading",
	depth,
	html_id: id,
	children: [{ type: "text", value: text }],
});

describe("walk and textOf", () => {
	it("visits the root and every descendant", () => {
		const tree: MystNode = {
			type: "root",
			children: [{ type: "block", children: [heading(1, "A")] }],
		};
		assert.deepEqual(
			walk(tree).map((node) => node.type),
			["root", "block", "heading", "text"],
		);
	});

	it("joins nested text but ignores raw html values", () => {
		const node: MystNode = {
			type: "paragraph",
			children: [
				{ type: "text", value: "Hello " },
				{ type: "html", value: "<b>" },
				{ type: "strong", children: [{ type: "text", value: "world" }] },
			],
		};
		assert.equal(textOf(node), "Hello world");
	});
});

describe("collectHeadings", () => {
	it("reads depth, id, and text", () => {
		const tree: MystNode = {
			type: "root",
			children: [
				heading(1, "Title", "title"),
				heading(2, "Section", "section"),
			],
		};
		assert.deepEqual(collectHeadings(tree), [
			{ depth: 1, slug: "title", text: "Title" },
			{ depth: 2, slug: "section", text: "Section" },
		]);
	});

	it("drops headings with no id, since a toc link needs one", () => {
		const tree: MystNode = { type: "root", children: [heading(1, "No id")] };
		assert.deepEqual(collectHeadings(tree), []);
	});
});

describe("collectImages", () => {
	it("separates relative, absolute, and remote urls", () => {
		const tree: MystNode = {
			type: "root",
			children: [
				{ type: "image", url: "./local.png" },
				{ type: "image", url: "nested/other.png" },
				{ type: "image", url: "/public.png" },
				{ type: "image", url: "https://example.com/remote.png" },
			],
		};
		const images = collectImages(tree);
		assert.deepEqual(images.local, ["./local.png", "nested/other.png"]);
		assert.deepEqual(images.remote, ["https://example.com/remote.png"]);
	});

	it("deduplicates repeated sources", () => {
		const tree: MystNode = {
			type: "root",
			children: [
				{ type: "image", url: "./a.png" },
				{ type: "image", url: "./a.png" },
			],
		};
		assert.deepEqual(collectImages(tree).local, ["./a.png"]);
	});
});

describe("fixCaptionNumbers", () => {
	it("copies enumerator to value, which is what the renderer reads", () => {
		const tree: MystNode = {
			type: "root",
			children: [{ type: "captionNumber", kind: "figure", enumerator: "2" }],
		};
		fixCaptionNumbers(tree);
		assert.equal(tree.children?.[0]?.value, "2");
	});

	it("leaves an existing value alone", () => {
		const tree: MystNode = {
			type: "root",
			children: [{ type: "captionNumber", value: "7", enumerator: "2" }],
		};
		fixCaptionNumbers(tree);
		assert.equal(tree.children?.[0]?.value, "7");
	});
});

describe("fenceInfo", () => {
	const source = ["# Title", "", "```js exec timeout=500", "code", "```"].join(
		"\n",
	);

	it("recovers the directives myst-parser discards", () => {
		assert.equal(fenceInfo(source, 3), "js exec timeout=500");
	});

	it("returns undefined for a line that is not a fence", () => {
		assert.equal(fenceInfo(source, 1), undefined);
	});

	it("handles tildes and indentation", () => {
		assert.equal(fenceInfo("  ~~~~py exec", 1), "py exec");
	});

	it("returns undefined past the end of the source", () => {
		assert.equal(fenceInfo(source, 99), undefined);
	});
});

describe("findExecutable", () => {
	const codeNode = (
		lang: string,
		line: number,
		extra: Record<string, unknown> = {},
	): MystNode => ({
		type: "code",
		lang,
		value: "x",
		position: { start: { line } },
		...extra,
	});

	it("finds fences carrying exec and skips plain ones", () => {
		const source = ["```js exec", "x", "```", "", "```js", "x", "```"].join(
			"\n",
		);
		const tree: MystNode = {
			type: "root",
			children: [codeNode("js", 1), codeNode("js", 5)],
		};
		const found = findExecutable(tree, source);
		assert.equal(found.length, 1);
		assert.equal(found[0]?.index, 0);
	});

	it("finds code-cell nodes without needing an info string", () => {
		const tree: MystNode = {
			type: "root",
			children: [codeNode("js", 1, { executable: true })],
		};
		assert.equal(findExecutable(tree, "").length, 1);
	});

	it("carries the directives through", () => {
		const source = "```ts exec hide-code timeout=250";
		const tree: MystNode = { type: "root", children: [codeNode("ts", 1)] };
		const directive = findExecutable(tree, source)[0]?.directive;
		assert.equal(directive?.hideCode, true);
		assert.equal(directive?.timeoutMs, 250);
	});

	it("reports the parent and index so output can be spliced in", () => {
		const source = ["text", "```js exec", "x", "```"].join("\n");
		const block: MystNode = {
			type: "block",
			children: [{ type: "paragraph" }, codeNode("js", 2)],
		};
		const tree: MystNode = { type: "root", children: [block] };
		const found = findExecutable(tree, source)[0];
		assert.equal(found?.parent, block);
		assert.equal(found?.index, 1);
	});

	it("ignores a fence with no language", () => {
		const tree: MystNode = {
			type: "root",
			children: [codeNode("", 1)],
		};
		assert.deepEqual(findExecutable(tree, "``` exec"), []);
	});
});

describe("rehypeAstroImages", () => {
	interface ImgTree {
		type: string;
		children: {
			type: string;
			tagName: string;
			properties: Record<string, unknown>;
		}[];
	}

	const imgTree = (
		src: string,
		properties: Record<string, unknown> = {},
	): ImgTree => ({
		type: "root",
		children: [
			{ type: "element", tagName: "img", properties: { src, ...properties } },
		],
	});

	it("stamps the marker astro looks for on collected local images", () => {
		const tree = imgTree("./a.png");
		rehypeAstroImages({ local: ["./a.png"], remote: [] })(tree);
		const marker = tree.children[0]?.properties?.__ASTRO_IMAGE_ as string;
		assert.equal(JSON.parse(marker).src, "./a.png");
		assert.equal(tree.children[0]?.properties?.src, undefined);
	});

	it("leaves uncollected sources untouched", () => {
		const tree = imgTree("/public.png");
		rehypeAstroImages({ local: ["./a.png"], remote: [] })(tree);
		assert.equal(tree.children[0]?.properties?.src, "/public.png");
	});

	it("keeps className, which hast spells differently from html", () => {
		const tree = imgTree("./a.png", { className: ["hero"] });
		rehypeAstroImages({ local: ["./a.png"], remote: [] })(tree);
		assert.deepEqual(tree.children[0]?.properties?.className, ["hero"]);
	});

	it("asks astro to infer the size of remote images", () => {
		const tree = imgTree("https://example.com/a.png");
		rehypeAstroImages({
			local: [],
			remote: ["https://example.com/a.png"],
		})(tree);
		const marker = tree.children[0]?.properties?.__ASTRO_IMAGE_ as string;
		assert.equal(JSON.parse(marker).inferSize, true);
	});

	it("indexes repeats so each occurrence resolves separately", () => {
		const tree: ImgTree = {
			type: "root",
			children: [
				{ type: "element", tagName: "img", properties: { src: "./a.png" } },
				{ type: "element", tagName: "img", properties: { src: "./a.png" } },
			],
		};
		rehypeAstroImages({ local: ["./a.png"], remote: [] })(tree);
		const indices = tree.children.map(
			(child) =>
				JSON.parse(child.properties?.__ASTRO_IMAGE_ as string).index as number,
		);
		assert.deepEqual(indices, [0, 1]);
	});

	it("does nothing at all when nothing was collected", () => {
		const tree = imgTree("./a.png");
		rehypeAstroImages({ local: [], remote: [] })(tree);
		assert.equal(tree.children[0]?.properties?.src, "./a.png");
	});
});

describe("dropEmptyOutputs", () => {
	it("removes the placeholder a code-cell leaves behind", () => {
		const tree: MystNode = {
			type: "root",
			children: [
				{ type: "code", value: "x" },
				{ type: "outputs", children: [] },
			],
		};
		dropEmptyOutputs(tree);
		assert.deepEqual(
			tree.children?.map((child) => child.type),
			["code"],
		);
	});

	it("keeps an outputs node that actually holds something", () => {
		const tree: MystNode = {
			type: "root",
			children: [{ type: "outputs", children: [{ type: "output" }] }],
		};
		dropEmptyOutputs(tree);
		assert.equal(tree.children?.length, 1);
	});
});

describe("labelUnresolvedLinks", () => {
	it("gives an empty internal link visible text", () => {
		const tree: MystNode = {
			type: "root",
			children: [{ type: "link", url: "#missing", children: [] }],
		};
		labelUnresolvedLinks(tree);
		assert.equal(textOf(tree), "#missing");
	});

	it("leaves resolved links alone", () => {
		const tree: MystNode = {
			type: "root",
			children: [
				{
					type: "link",
					url: "#intro",
					children: [{ type: "text", value: "Introduction" }],
				},
			],
		};
		labelUnresolvedLinks(tree);
		assert.equal(textOf(tree), "Introduction");
	});

	it("ignores external links with no text", () => {
		const tree: MystNode = {
			type: "root",
			children: [{ type: "link", url: "https://example.com", children: [] }],
		};
		labelUnresolvedLinks(tree);
		assert.equal(textOf(tree), "");
	});
});

describe("applyTargetIds", () => {
	const idOf = (node: MystNode) =>
		(node.data as { hProperties?: { id?: string } } | undefined)?.hProperties
			?.id;

	it("gives a paragraph target a rendered id", () => {
		const tree: MystNode = {
			type: "root",
			children: [{ type: "paragraph", identifier: "intro" }],
		};
		applyTargetIds(tree);
		assert.equal(idOf(tree.children?.[0] as MystNode), "intro");
	});

	it("uses identifier, not the deduped html_id references may have taken", () => {
		// A reference earlier in the document takes "fig-one" from MyST's id
		// pass, leaving the figure with "fig-one-1". Links still point at
		// "#fig-one", so the target must carry that.
		const tree: MystNode = {
			type: "root",
			children: [
				{ type: "container", identifier: "fig-one", html_id: "fig-one-1" },
			],
		};
		applyTargetIds(tree);
		assert.equal(idOf(tree.children?.[0] as MystNode), "fig-one");
	});

	it("never puts an id on a reference to something else", () => {
		const tree: MystNode = {
			type: "root",
			children: [
				{ type: "link", url: "#fig-one", identifier: "fig-one" },
				{ type: "crossReference", identifier: "fig-one" },
			],
		};
		applyTargetIds(tree);
		assert.equal(idOf(tree.children?.[0] as MystNode), undefined);
		assert.equal(idOf(tree.children?.[1] as MystNode), undefined);
	});

	it("claims each identifier once, so the document has no duplicate ids", () => {
		const tree: MystNode = {
			type: "root",
			children: [
				{ type: "container", identifier: "fig-one" },
				{ type: "image", identifier: "fig-one" },
			],
		};
		applyTargetIds(tree);
		assert.equal(idOf(tree.children?.[0] as MystNode), "fig-one");
		assert.equal(idOf(tree.children?.[1] as MystNode), undefined);
	});

	it("skips caption numbers, which only inherit the identifier", () => {
		const tree: MystNode = {
			type: "root",
			children: [{ type: "captionNumber", identifier: "fig-one" }],
		};
		applyTargetIds(tree);
		assert.equal(idOf(tree.children?.[0] as MystNode), undefined);
	});

	it("leaves an id somebody already set alone", () => {
		const tree: MystNode = {
			type: "root",
			children: [
				{
					type: "paragraph",
					identifier: "intro",
					data: { hProperties: { id: "chosen" } },
				},
			],
		};
		applyTargetIds(tree);
		assert.equal(idOf(tree.children?.[0] as MystNode), "chosen");
	});
});
