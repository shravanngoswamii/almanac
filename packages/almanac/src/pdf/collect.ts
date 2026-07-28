import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MystNode } from "../myst/deps.ts";
import type { BookTocOptions, StyleOptions } from "./preamble.ts";
import { compilePdf, toTypst } from "./typst.ts";

export interface PendingPdf {
	/** Collection id, which is also the output path under the pdf directory. */
	id: string;
	tree: MystNode;
	title?: string;
	subtitle?: string;
	/** Directory the page's relative image paths are written against. */
	sourceDir?: string;
}

/**
 * Pages queued during content rendering and compiled after the build.
 *
 * Compilation is deferred rather than done inline because Typst wants to run
 * once with a warm compiler, and because writing into the output directory is
 * only safe after Astro has finished creating it.
 */
export class PdfQueue {
	readonly pages = new Map<string, PendingPdf>();

	add(page: PendingPdf): void {
		this.pages.set(page.id, page);
	}

	get size(): number {
		return this.pages.size;
	}
}

export interface BookOptions {
	enabled: boolean;
	filename: string;
	title?: string;
	subtitle?: string;
	toc: BookTocOptions;
	/** Path to a Typst template, relative to the project root. */
	template?: string;
	/** Ids in reading order. Anything not listed follows, sorted. */
	order?: string[];
}

export interface WriteOptions {
	root: string;
	outDir: string;
	/** Directory inside the output, matching the link the layout emits. */
	prefix: string;
	author?: string;
	site?: string;
	style: StyleOptions;
	/** Path to a per-page Typst template, relative to the project root. */
	template?: string;
	book?: BookOptions;
	/** ISO date for the cover, passed in so the output is reproducible. */
	date?: string;
	/** Emit one PDF per page. Off leaves only the book, if that is enabled. */
	perPage?: boolean;
	onError?: (id: string, message: string) => void;
	/** Non-fatal notes, such as a figure that could not be included. */
	onNote?: (id: string, message: string) => void;
}

export interface WriteResult {
	written: number;
	failed: number;
	book?: { written: boolean; chapters: number };
}

async function loadTemplate(
	root: string,
	relative: string | undefined,
): Promise<string | undefined> {
	if (!relative) return undefined;
	return await readFile(path.resolve(root, relative), "utf8");
}

/**
 * Reading order for the book.
 *
 * The configured sidebar is the author's own ordering, so it is preferred over
 * anything derived. Pages the sidebar does not mention still appear, after the
 * ones it does, rather than being silently dropped from the book.
 */
export function bookOrder(ids: string[], preferred?: string[]): string[] {
	const remaining = new Set(ids);
	const ordered: string[] = [];
	for (const id of preferred ?? []) {
		if (remaining.delete(id)) ordered.push(id);
	}
	return [...ordered, ...[...remaining].sort()];
}

/**
 * Compiles every queued page and writes it into the output directory.
 *
 * A page that fails to compile is reported and skipped rather than failing the
 * build: the HTML for that page is already correct, and losing the whole site
 * because one document confused the typesetter is the wrong trade.
 */
export async function writePdfs(
	queue: PdfQueue,
	options: WriteOptions,
): Promise<WriteResult> {
	let written = 0;
	let failed = 0;

	const pageTemplate = await loadTemplate(options.root, options.template);

	if (options.perPage !== false) {
		for (const page of queue.pages.values()) {
			const target = path.join(
				options.outDir,
				options.prefix,
				`${page.id}.pdf`,
			);
			try {
				const source = await toTypst(page.tree, {
					root: options.root,
					sourceDir: page.sourceDir,
					style: options.style,
					meta: {
						kind: "page",
						title: page.title,
						subtitle: page.subtitle,
						author: options.author,
						source: options.site,
						date: options.date,
					},
					...(pageTemplate !== undefined ? { template: pageTemplate } : {}),
					onNote: (message) => options.onNote?.(page.id, message),
				});
				const bytes = await compilePdf(source, options.root);
				await mkdir(path.dirname(target), { recursive: true });
				await writeFile(target, bytes);
				written += 1;
			} catch (error) {
				failed += 1;
				options.onError?.(
					page.id,
					error instanceof Error ? error.message : String(error),
				);
			}
		}
	}

	let book: WriteResult["book"];
	if (options.book?.enabled) {
		book = await writeBook(queue, options, options.book);
		if (!book.written) failed += 1;
	}

	return { written, failed, ...(book ? { book } : {}) };
}

/**
 * One PDF holding every page, in reading order.
 *
 * Each page's body is converted separately and then concatenated, rather than
 * merging the trees, because conversion mutates a tree in place and a shared
 * reference state would renumber one chapter's figures from another's counts.
 */
async function writeBook(
	queue: PdfQueue,
	options: WriteOptions,
	book: BookOptions,
): Promise<{ written: boolean; chapters: number }> {
	const order = bookOrder([...queue.pages.keys()], book.order);
	const chapters: { title: string; body: string }[] = [];

	for (const id of order) {
		const page = queue.pages.get(id);
		if (!page) continue;
		try {
			const body = await toTypst(page.tree, {
				root: options.root,
				sourceDir: page.sourceDir,
				style: options.style,
				meta: { kind: "page" },
				// An empty template suppresses the built-in page furniture: in a
				// book the chapter heading below is the title.
				template: "",
				onNote: (message) => options.onNote?.(id, message),
			});
			chapters.push({ title: page.title ?? id, body });
		} catch (error) {
			options.onError?.(
				id,
				`could not be added to the book: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	if (chapters.length === 0) return { written: false, chapters: 0 };

	const bookTemplate = await loadTemplate(options.root, book.template);
	const front = await toTypst(
		{ type: "root", children: [] },
		{
			root: options.root,
			style: { ...options.style, numberHeadings: true },
			meta: {
				kind: "book",
				title: book.title,
				subtitle: book.subtitle,
				author: options.author,
				source: options.site,
				date: options.date,
				chapters: chapters.map((chapter) => chapter.title),
			},
			toc: book.toc,
			...(bookTemplate !== undefined ? { template: bookTemplate } : {}),
		},
	);

	const body = chapters
		.map(
			(chapter, index) =>
				`${index > 0 ? "#pagebreak()\n\n" : ""}= ${chapter.title}\n\n${chapter.body}`,
		)
		.join("\n\n");

	try {
		const bytes = await compilePdf(`${front}\n${body}\n`, options.root);
		const target = path.join(options.outDir, options.prefix, book.filename);
		await mkdir(path.dirname(target), { recursive: true });
		await writeFile(target, bytes);
		return { written: true, chapters: chapters.length };
	} catch (error) {
		options.onError?.(
			book.filename,
			error instanceof Error ? error.message : String(error),
		);
		return { written: false, chapters: chapters.length };
	}
}
