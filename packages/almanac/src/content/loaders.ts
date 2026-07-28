import { glob } from "astro/loaders";
import almanacConfig from "virtual:almanac/config";
import { overlayLoader } from "./overlayLoader.ts";
import {
	buildVariants,
	type LocaleSpec,
	type VersionSpec,
} from "./variants.ts";

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

export interface DocsLoaderOptions extends LoaderOptions {
	versions?: VersionSpec[];
	locales?: LocaleSpec[];
	defaultLocale?: string;
}

/**
 * Versions and locales default to whatever `astro.config.mjs` declared, so the
 * content config does not have to repeat them. Passing them explicitly still
 * wins, which is what makes this testable.
 */
export function docsLoader(options: DocsLoaderOptions = {}) {
	const base = options.path ?? almanacConfig.docs.path ?? "docs";
	const pattern = options.pattern ?? DEFAULT_PATTERN;
	const versions = options.versions ?? almanacConfig.versions ?? [];
	const locales = options.locales ?? almanacConfig.i18n?.locales ?? [];
	const defaultLocale =
		options.defaultLocale ?? almanacConfig.i18n?.defaultLocale;
	const hasVariants = versions.length > 0 || locales.length > 0;

	// The plain glob loader when there is nothing to overlay: one code path for
	// the common case, and no chance of the composed loader changing ids on a
	// site that uses neither feature.
	if (!hasVariants) return glob({ base: `./${base}`, pattern });

	return overlayLoader({
		name: "almanac-docs",
		pattern,
		variants: buildVariants({ base, versions, locales, defaultLocale }),
	});
}

export function blogLoader(options: LoaderOptions = {}) {
	return glob({
		base: `./${options.path ?? "blog"}`,
		pattern: options.pattern ?? DEFAULT_PATTERN,
	});
}
