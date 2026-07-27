import { glob } from "astro/loaders";

export interface LoaderOptions {
	/** Directory holding the content, relative to the project root. */
	path?: string;
	/** Glob pattern within that directory. */
	pattern?: string | string[];
}

/**
 * Content lives in top-level directories rather than under src/, so writers
 * never touch the source tree. The leading "!" patterns keep partials and
 * co-located assets out of the collection.
 */
const DEFAULT_PATTERN = ["**/*.{md,mdx,mdoc}", "!**/_*/**", "!**/_*"];

export function docsLoader(options: LoaderOptions = {}) {
	return glob({
		base: `./${options.path ?? "docs"}`,
		pattern: options.pattern ?? DEFAULT_PATTERN,
	});
}

export function blogLoader(options: LoaderOptions = {}) {
	return glob({
		base: `./${options.path ?? "blog"}`,
		pattern: options.pattern ?? DEFAULT_PATTERN,
	});
}
