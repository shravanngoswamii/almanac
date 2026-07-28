import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MystNode } from "../myst/deps.ts";
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

export interface WriteOptions {
	root: string;
	outDir: string;
	/** Directory inside the output, matching the link the layout emits. */
	prefix: string;
	author?: string;
	site?: string;
	onError?: (id: string, message: string) => void;
	/** Non-fatal notes, such as a figure that could not be included. */
	onNote?: (id: string, message: string) => void;
}

export interface WriteResult {
	written: number;
	failed: number;
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

	for (const page of queue.pages.values()) {
		const target = path.join(options.outDir, options.prefix, `${page.id}.pdf`);
		try {
			const source = await toTypst(page.tree, {
				root: options.root,
				sourceDir: page.sourceDir,
				title: page.title,
				subtitle: page.subtitle,
				author: options.author,
				source: options.site,
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

	return { written, failed };
}
