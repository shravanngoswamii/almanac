import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { MystNode, MystPipeline, MystVFile } from "../myst/deps.ts";
import {
	type BookTocOptions,
	type DocumentMeta,
	type StyleOptions,
	preamble,
} from "./preamble.ts";

/**
 * Converts raw HTML nodes into something Typst can typeset.
 *
 * Two kinds arrive here and they want opposite treatment. Executed output is
 * program output, so it belongs in a monospace block. Everything else, a callout
 * written as a `<div>` for instance, is prose, and setting prose in monospace
 * makes a page look broken. Dropping either would print a document that
 * disagrees with the page.
 */
function htmlToTypstFriendly(tree: MystNode): void {
	const visit = (node: MystNode) => {
		if (!Array.isArray(node.children)) return;
		node.children = node.children.flatMap((child) => {
			if (child.type === "html" && typeof child.value === "string") {
				const text = stripTags(child.value);
				if (!text) return [];
				if (isProgramOutput(child.value)) {
					return [{ type: "code", lang: "text", value: text }];
				}
				return [
					{
						type: "blockquote",
						children: text.split("\n").map((line) => ({
							type: "paragraph",
							children: [{ type: "text", value: line }],
						})),
					},
				];
			}
			visit(child);
			return [child];
		});
	};
	visit(tree);
}

/** Output blocks carry the class the stylesheet targets. */
export function isProgramOutput(html: string): boolean {
	return /class="exec-(result|stream|artifact)/.test(html);
}

/** Text content of a fragment of HTML, with entities of ours decoded. */
export function stripTags(html: string): string {
	return html
		.replace(/<figcaption[\s\S]*?<\/figcaption>/g, "")
		.replace(/<[^>]+>/g, "\n")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&amp;/g, "&")
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.join("\n");
}

export interface ToTypstOptions {
	root: string;
	meta: DocumentMeta;
	style: StyleOptions;
	toc?: BookTocOptions;
	/** Typst source that replaces the built-in template. */
	template?: string;
	/** Directory the page's relative image paths are resolved against. */
	sourceDir?: string;
	onNote?: (message: string) => void;
}

/**
 * Rewrites images so the typesetter can find them.
 *
 * Typst resolves paths against its workspace root and cannot fetch over the
 * network. Local images become workspace-relative paths; remote ones are
 * replaced by a visible line, because silently dropping a figure would make the
 * PDF quietly disagree with the page.
 */
function resolveImages(
	tree: MystNode,
	options: { root: string; sourceDir?: string; onNote?: (m: string) => void },
): void {
	const visit = (node: MystNode) => {
		if (!Array.isArray(node.children)) return;
		node.children = node.children.map((child) => {
			if (child.type !== "image" || typeof child.url !== "string") {
				visit(child);
				return child;
			}

			const url = child.url;
			if (URL.canParse(url)) {
				options.onNote?.(`remote image not included in the PDF: ${url}`);
				return {
					type: "paragraph",
					children: [
						{
							type: "emphasis",
							children: [{ type: "text", value: `[image: ${url}]` }],
						},
					],
				};
			}

			const absolute = url.startsWith("/")
				? path.join(options.root, url.slice(1))
				: path.resolve(options.sourceDir ?? options.root, url);
			const relative = path.relative(options.root, absolute);
			if (relative.startsWith("..")) {
				options.onNote?.(`image outside the project not included: ${url}`);
				return { type: "paragraph", children: [] };
			}

			child.url = `/${relative.split(path.sep).join("/")}`;
			return child;
		});
	};
	visit(tree);
}

/**
 * Typst source for a MyST document.
 *
 * The tree is consumed after the web render, so it already has references
 * resolved and execution output in place: the PDF says the same thing the page
 * does, rather than being a second parse that could disagree with it.
 */
export async function toTypst(
	tree: MystNode,
	options: ToTypstOptions,
): Promise<string> {
	const require = createRequire(path.join(options.root, "package.json"));

	let mystToTypst: unknown;
	try {
		const specifier = pathToFileURL(require.resolve("myst-to-typst")).href;
		mystToTypst = ((await import(specifier)) as { default: unknown }).default;
	} catch {
		throw new Error(
			"[almanac] PDF output needs `myst-to-typst`. Install it with:\n  npm install myst-to-typst @myriaddreamin/typst-ts-node-compiler",
		);
	}

	const { unified } = (await import(
		pathToFileURL(require.resolve("unified")).href
	)) as { unified: () => MystPipeline };
	const { VFile } = (await import(
		pathToFileURL(require.resolve("vfile")).href
	)) as { VFile: new () => MystVFile };

	htmlToTypstFriendly(tree);
	resolveImages(tree, {
		root: options.root,
		sourceDir: options.sourceDir,
		onNote: options.onNote,
	});

	const file = new VFile() as MystVFile & {
		result?: {
			value?: string;
			macros?: string[];
			commands?: Record<string, string>;
		};
	};
	const pipe = unified().use(mystToTypst) as MystPipeline & {
		runSync(tree: unknown, file: unknown): unknown;
		stringify(tree: unknown, file: unknown): string;
	};
	const stringified = pipe.stringify(pipe.runSync(tree, file), file);
	const body = file.result?.value ?? String(stringified);

	// The serializer records the macros and commands its output depends on
	// separately from the body, so a document that uses an admonition or a
	// custom math operator fails to compile unless they are emitted too.
	const macros = file.result?.macros ?? [];
	const commands = Object.values(file.result?.commands ?? {});
	const definitions = [...macros, ...commands].join("\n");

	return [
		preamble({
			meta: options.meta,
			style: options.style,
			toc: options.toc,
			...(options.template !== undefined ? { custom: options.template } : {}),
		}),
		definitions,
		"",
		body,
		"",
	].join("\n");
}

/**
 * Compiles Typst source to PDF bytes.
 *
 * The compiler is created once and reused: it holds a font book and a parsed
 * standard library, and building those per page turned a 20 page site into a
 * noticeably slower build.
 */
interface CompileResult {
	result?: unknown;
	hasError?: () => boolean;
	takeDiagnostics?: () => unknown;
}

interface Compiler {
	compile(input: { mainFileContent: string }): CompileResult;
	pdf(input: { mainFileContent: string }): Uint8Array;
	fetchDiagnostics(diagnostics: unknown): { message?: string }[];
}

let compiler: Compiler | undefined;

export async function compilePdf(
	source: string,
	root: string,
): Promise<Uint8Array> {
	if (!compiler) {
		const require = createRequire(path.join(root, "package.json"));
		let specifier: string;
		try {
			specifier = pathToFileURL(
				require.resolve("@myriaddreamin/typst-ts-node-compiler"),
			).href;
		} catch {
			throw new Error(
				"[almanac] PDF output needs `@myriaddreamin/typst-ts-node-compiler`. Install it with:\n  npm install myst-to-typst @myriaddreamin/typst-ts-node-compiler",
			);
		}
		const { NodeCompiler } = (await import(specifier)) as {
			NodeCompiler: { create(args?: { workspace?: string }): Compiler };
		};
		// The workspace is what a leading slash in an image path refers to, so
		// it has to be the project root for figures to resolve.
		compiler = NodeCompiler.create({ workspace: root });
	}

	// Compiled first rather than going straight to pdf(): on failure the
	// compiler throws an Error with an empty message and the real diagnostics
	// behind a separate call, which is useless to report.
	const result = compiler.compile({ mainFileContent: source });
	if (!result.result) {
		const diagnostics = compiler.fetchDiagnostics(
			result.takeDiagnostics?.() ?? result,
		);
		const messages = diagnostics
			.map((entry) => entry.message)
			.filter(Boolean)
			.slice(0, 5);
		throw new Error(
			messages.length > 0
				? messages.join("; ")
				: "typst reported no diagnostics",
		);
	}

	return compiler.pdf({ mainFileContent: source });
}

/** Test seam: forget the cached compiler. */
export function resetCompiler(): void {
	compiler = undefined;
}
