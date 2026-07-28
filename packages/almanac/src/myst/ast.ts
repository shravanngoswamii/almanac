import type { MystNode } from "./deps.ts";

export interface MystHeading {
	depth: number;
	slug: string;
	text: string;
}

/** Depth-first walk that yields every node, the root included. */
export function walk(node: MystNode): MystNode[] {
	const out: MystNode[] = [node];
	for (const child of node.children ?? []) out.push(...walk(child));
	return out;
}

/** Visible text of a subtree, which is what a heading label needs. */
export function textOf(node: MystNode): string {
	if (typeof node.value === "string" && node.type !== "html") return node.value;
	return (node.children ?? []).map(textOf).join("");
}

/**
 * Headings in the shape Astro's `headings` metadata uses. Run this after ids
 * have been assigned, since the slug has to match the id in the rendered HTML
 * or every table of contents link points at nothing.
 */
export function collectHeadings(tree: MystNode): MystHeading[] {
	return walk(tree)
		.filter((node) => node.type === "heading")
		.map((node) => ({
			depth: typeof node.depth === "number" ? node.depth : 1,
			// The renderer writes `identifier` as the id and only falls back to
			// `html_id`, so a toc slug taken from html_id can point at nothing.
			slug:
				typeof node.identifier === "string"
					? node.identifier
					: typeof node.html_id === "string"
						? node.html_id
						: "",
			text: textOf(node).trim(),
		}))
		.filter((heading) => heading.slug !== "");
}

export interface CollectedImages {
	local: string[];
	remote: string[];
}

/**
 * Mirrors Astro's own collection rules so that MyST mode feeds the same asset
 * pipeline: root-relative paths are served as-is and collected by neither list.
 */
export function collectImages(tree: MystNode): CollectedImages {
	const local = new Set<string>();
	const remote = new Set<string>();

	for (const node of walk(tree)) {
		if (node.type !== "image" || typeof node.url !== "string") continue;
		let url: string;
		try {
			url = decodeURI(node.url);
		} catch {
			continue;
		}
		if (URL.canParse(url)) remote.add(url);
		else if (!url.startsWith("/")) local.add(url);
	}

	return { local: [...local], remote: [...remote] };
}

/**
 * myst-transforms writes the container number to `enumerator`, while
 * myst-to-html's renderer still reads `value`. Without this bridge every
 * numbered caption renders as "Figure undefined".
 */
export function fixCaptionNumbers(tree: MystNode): void {
	for (const node of walk(tree)) {
		if (node.type !== "captionNumber") continue;
		if (node.value === undefined && node.enumerator !== undefined) {
			node.value = node.enumerator;
		}
	}
}

/**
 * Removes the empty `outputs` node MyST pairs with every `{code-cell}`.
 *
 * It exists to hold notebook results, and Almanac renders execution output
 * itself, so leaving it behind emits a stray empty div into every page that
 * uses the directive.
 */
export function dropEmptyOutputs(tree: MystNode): void {
	for (const node of walk(tree)) {
		if (!Array.isArray(node.children)) continue;
		node.children = node.children.filter(
			(child) => child.type !== "outputs" || (child.children?.length ?? 0) > 0,
		);
	}
}

/**
 * Gives unresolved internal links visible text.
 *
 * MyST leaves `[](#missing)` as an empty anchor, which renders as nothing at
 * all: the reader cannot see that a reference is broken and neither can anyone
 * reviewing the page. The build already warns; this makes the page itself
 * honest.
 */
export function labelUnresolvedLinks(tree: MystNode): void {
	for (const node of walk(tree)) {
		if (node.type !== "link" || typeof node.url !== "string") continue;
		if (!node.url.startsWith("#")) continue;
		if ((node.children?.length ?? 0) > 0) continue;
		node.children = [{ type: "text", value: node.url }];
	}
}

const REFERENCE_TYPES = new Set([
	"link",
	"crossReference",
	"cite",
	"citeGroup",
	"footnoteReference",
	"imageReference",
]);

/** Decorations that inherit an identifier without being the thing referenced. */
const NOT_A_TARGET = new Set(["captionNumber"]);

/**
 * Puts every target's identifier on the node it labels, as a rendered id.
 *
 * MyST resolves a reference to any node, but only a few node types have a
 * renderer that emits an id, so `(label)=` above a paragraph produces working
 * link text pointing at an anchor that does not exist. Writing the id through
 * `data.hProperties` is how mdast-util-to-hast lets a node contribute
 * attributes, and both the default and custom handlers apply it.
 *
 * The id has to be `identifier` rather than `html_id`: references are written as
 * `#identifier`, and MyST's own id pass hands out `html_id` in document order,
 * so a reference appearing before its target takes the clean name and leaves the
 * target with a numbered variant nothing links to.
 */
export function applyTargetIds(tree: MystNode): void {
	const claimed = new Set<string>();

	for (const node of walk(tree)) {
		if (REFERENCE_TYPES.has(node.type) || NOT_A_TARGET.has(node.type)) continue;

		const identifier =
			typeof node.identifier === "string"
				? node.identifier
				: typeof node.html_id === "string"
					? node.html_id
					: undefined;
		if (!identifier || claimed.has(identifier)) continue;
		claimed.add(identifier);

		node.data ??= {};
		const data = node.data as { hProperties?: Record<string, unknown> };
		data.hProperties ??= {};
		data.hProperties.id ??= identifier;
	}
}
