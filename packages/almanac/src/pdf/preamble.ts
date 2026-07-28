export interface DocumentMeta {
	title?: string;
	subtitle?: string;
	author?: string;
	/** Usually the site URL, rendered under the title. */
	source?: string;
	/** "page" for a single document, "book" for the whole collection. */
	kind?: "page" | "book";
	/** Chapter titles, in order, for a book. */
	chapters?: string[];
	/** Passed in rather than read, so the output stays reproducible. */
	date?: string;
}

export interface StyleOptions {
	paper?: string;
	/** Typst margin value, e.g. "(x: 2.2cm, y: 2.4cm)". */
	margin?: string;
	bodyFont?: string[];
	monoFont?: string[];
	bodySize?: string;
	accent?: string;
	/** Number headings, which a book usually wants and a page usually does not. */
	numberHeadings?: boolean;
}

export interface BookTocOptions {
	enabled?: boolean;
	title?: string;
	depth?: number;
}

export function quote(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function fontList(fonts: string[]): string {
	return `(${fonts.map((font) => `"${quote(font)}"`).join(", ")})`;
}

/**
 * The metadata a template can read, as a Typst dictionary named `almanac`.
 *
 * Passed as source rather than through the compiler's `inputs`, because inputs
 * are fixed when the compiler is created and one compiler serves every page in
 * a build.
 */
export function metaBlock(meta: DocumentMeta): string {
	const chapters = (meta.chapters ?? [])
		.map((title) => `"${quote(title)}"`)
		.join(", ");
	return [
		"#let almanac = (",
		`  title: "${quote(meta.title ?? "")}",`,
		`  subtitle: "${quote(meta.subtitle ?? "")}",`,
		`  author: "${quote(meta.author ?? "")}",`,
		`  source: "${quote(meta.source ?? "")}",`,
		`  kind: "${meta.kind ?? "page"}",`,
		`  date: "${quote(meta.date ?? "")}",`,
		`  chapters: (${chapters}${chapters ? "," : ""}),`,
		")",
		"",
	].join("\n");
}

/**
 * Values myst-to-typst expects the surrounding template to define.
 *
 * It emits its own macros for admonitions and figures but reads these, and they
 * are defined in terms of Typst builtins rather than imported from the package
 * registry so a build never depends on the network. Emitted even with a custom
 * template, because the serializer's output would not compile without them.
 */
export function requiredDefinitions(): string {
	return [
		"#let breakableDefault = false",
		"#let tableStyle = (stroke: 0.5pt + luma(180), inset: 6pt)",
		"#let columnStyle = (:)",
		"#let tablex(columns: 1, header-rows: 0, repeat-header: false, ..args) = {",
		"  table(columns: columns, ..args.named(), ..args.pos())",
		"}",
		"",
	].join("\n");
}

const DEFAULT_BODY = ["Liberation Serif", "DejaVu Serif", "Times New Roman"];
const DEFAULT_MONO = ["Liberation Mono", "DejaVu Sans Mono"];

/** Page setup and typography, shared by the built-in page and book templates. */
function styleBlock(style: StyleOptions, meta: DocumentMeta): string {
	const accent = style.accent ?? "#14724b";
	const numbered = meta.kind === "book";
	const lines = [
		`#set page(paper: "${quote(style.paper ?? "a4")}", margin: ${style.margin ?? "(x: 2.2cm, y: 2.4cm)"}${numbered ? ', numbering: "1", number-align: center' : ""})`,
		`#set text(size: ${style.bodySize ?? "10.5pt"}, font: ${fontList(style.bodyFont ?? DEFAULT_BODY)})`,
		"#set par(justify: false, leading: 0.68em)",
		"#show heading: set block(above: 1.4em, below: 0.8em)",
		`#show raw: set text(font: ${fontList(style.monoFont ?? DEFAULT_MONO)}, size: 9pt)`,
		`#show link: set text(fill: rgb("${accent}"))`,
	];
	if (style.numberHeadings ?? numbered) {
		lines.push('#set heading(numbering: "1.1")');
	}
	lines.push("");
	return lines.join("\n");
}

/** Title block for a single page. */
function pageTitle(meta: DocumentMeta): string {
	if (!meta.title) return "";
	const lines = [
		`#align(center)[#text(size: 20pt, weight: "bold")[${quote(meta.title)}]]`,
	];
	if (meta.subtitle) {
		lines.push(
			`#align(center)[#text(size: 11pt, fill: luma(90))[${quote(meta.subtitle)}]]`,
		);
	}
	const footer = [meta.author, meta.source].filter(Boolean).join(" / ");
	if (footer) {
		lines.push(
			`#align(center)[#text(size: 9pt, fill: luma(120))[${quote(footer)}]]`,
		);
	}
	lines.push("#v(1.2em)", "");
	return lines.join("\n");
}

/**
 * Cover page and table of contents for a book.
 *
 * The outline is Typst's own, so its entries are clickable and carry real page
 * numbers, and a reader's PDF bookmark pane is populated from the headings
 * without anything extra.
 */
function bookFront(
	meta: DocumentMeta,
	toc: BookTocOptions,
	style: StyleOptions,
): string {
	const accent = style.accent ?? "#14724b";
	const lines = [
		"#page(numbering: none)[",
		"  #v(22%)",
		`  #align(center)[#text(size: 34pt, weight: "bold")[${quote(meta.title ?? "")}]]`,
	];
	if (meta.subtitle) {
		lines.push(
			`  #align(center)[#v(0.6em) #text(size: 13pt, fill: luma(90))[${quote(meta.subtitle)}]]`,
		);
	}
	lines.push(
		`  #align(center)[#v(1.4em) #line(length: 28%, stroke: 1pt + rgb("${accent}"))]`,
	);
	const footer = [meta.author, meta.source].filter(Boolean).join("   ");
	if (footer) {
		lines.push(
			`  #align(center)[#v(1.4em) #text(size: 10pt, fill: luma(110))[${quote(footer)}]]`,
		);
	}
	if (meta.date) {
		lines.push(
			`  #align(bottom + center)[#text(size: 9pt, fill: luma(140))[${quote(meta.date)}]]`,
		);
	}
	lines.push("]", "");

	if (toc.enabled !== false) {
		lines.push(
			"#page(numbering: none)[",
			`  #text(size: 18pt, weight: "bold")[${quote(toc.title ?? "Contents")}]`,
			"  #v(0.8em)",
			`  #outline(title: none, depth: ${toc.depth ?? 2}, indent: 1.2em)`,
			"]",
			"",
			// Body numbering starts after the front matter, so page 1 is the
			// first chapter rather than the cover.
			"#counter(page).update(1)",
			"",
		);
	}

	return lines.join("\n");
}

export interface TemplateInput {
	meta: DocumentMeta;
	style: StyleOptions;
	toc?: BookTocOptions;
	/** Replaces the built-in styling and title block entirely. */
	custom?: string;
}

/** Everything that precedes the converted content. */
export function preamble(input: TemplateInput): string {
	const parts = [metaBlock(input.meta), requiredDefinitions()];

	if (input.custom !== undefined) {
		parts.push(input.custom, "");
		return parts.join("\n");
	}

	parts.push(styleBlock(input.style, input.meta));
	parts.push(
		input.meta.kind === "book"
			? bookFront(input.meta, input.toc ?? {}, input.style)
			: pageTitle(input.meta),
	);
	return parts.join("\n");
}
