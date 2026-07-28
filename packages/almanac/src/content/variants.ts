/**
 * Versions and locales are the same idea twice: a directory that shadows the
 * main content tree, whose pages are served under a URL prefix, and whose
 * missing pages fall back to the tree it shadows.
 *
 * Treating them as one mechanism is what keeps the cost down. Docusaurus
 * snapshots every file per version, which is why its own documentation opens by
 * suggesting you avoid versioning; here an old version stores only what it
 * changed.
 */

export interface VersionSpec {
	/** Appears in URLs, so "1.0" gives /docs/1.0/page. */
	name: string;
	label?: string;
	/** Defaults to versioned_docs/version-<name>. */
	path?: string;
}

export interface LocaleSpec {
	/** BCP 47 tag, used as the URL prefix and the html lang attribute. */
	code: string;
	label?: string;
	/** Right to left scripts need the direction on the html element. */
	dir?: "ltr" | "rtl";
	/** Defaults to i18n/<code>/docs. */
	path?: string;
}

export interface Variant {
	/** Empty for the current version in the default locale. */
	prefix: string;
	locale?: string;
	version?: string;
	/**
	 * Content directories, least specific first. Later ones shadow earlier ones,
	 * and anything absent from all of them simply does not exist here.
	 */
	sources: string[];
}

export interface VariantOptions {
	/** Base docs directory, relative to the project root. */
	base: string;
	versions?: VersionSpec[];
	locales?: LocaleSpec[];
	defaultLocale?: string;
}

export function versionPath(version: VersionSpec): string {
	return version.path ?? `versioned_docs/version-${version.name}`;
}

export function localePath(locale: LocaleSpec, base: string): string {
	return locale.path ?? `i18n/${locale.code}/${base}`;
}

/**
 * Every variant of the docs tree, with the source directories each one reads.
 *
 * The default locale's current version comes first with an empty prefix, so the
 * common case keeps its plain URLs and nothing about enabling either feature
 * moves an existing page.
 */
export function buildVariants(options: VariantOptions): Variant[] {
	const { base } = options;
	const versions = options.versions ?? [];
	const locales = (options.locales ?? []).filter(
		(locale) => locale.code !== options.defaultLocale,
	);

	const variants: Variant[] = [{ prefix: "", sources: [base] }];

	for (const version of versions) {
		variants.push({
			prefix: version.name,
			version: version.name,
			// Base first: a page the version never changed is inherited rather
			// than copied, which is the whole point of the overlay.
			sources: [base, versionPath(version)],
		});
	}

	for (const locale of locales) {
		const translated = localePath(locale, base);
		variants.push({
			prefix: locale.code,
			locale: locale.code,
			// An untranslated page falls back to the original rather than
			// vanishing, so a partial translation is still a usable site.
			sources: [base, translated],
		});

		for (const version of versions) {
			variants.push({
				prefix: `${locale.code}/${version.name}`,
				locale: locale.code,
				version: version.name,
				sources: [
					base,
					versionPath(version),
					translated,
					`${translated.replace(/\/$/, "")}/${versionPath(version)}`,
				],
			});
		}
	}

	return variants;
}

/** The variant an entry id belongs to, longest prefix first. */
export function variantForId(
	id: string,
	variants: Variant[],
): Variant | undefined {
	const sorted = [...variants].sort(
		(a, b) => b.prefix.length - a.prefix.length,
	);
	return sorted.find(
		(variant) =>
			variant.prefix === "" ||
			id === variant.prefix ||
			id.startsWith(`${variant.prefix}/`),
	);
}

/** An entry id with its variant prefix removed, for sidebar matching. */
export function stripPrefix(id: string, prefix: string): string {
	if (!prefix) return id;
	if (id === prefix) return "";
	return id.startsWith(`${prefix}/`) ? id.slice(prefix.length + 1) : id;
}

/**
 * Entries belonging to one variant, with the variant prefix removed.
 *
 * Stripping the prefix is what lets an explicit sidebar keep listing plain ids
 * like "guides/writing" and still resolve inside every version and locale. The
 * prefix comes back through the base the hrefs are built from.
 */
export function scopeEntries<T extends { id: string }>(
	entries: T[],
	variants: Variant[],
	variant: Variant,
): T[] {
	return entries
		.filter(
			(entry) => variantForId(entry.id, variants)?.prefix === variant.prefix,
		)
		.map((entry) => ({ ...entry, id: stripPrefix(entry.id, variant.prefix) }));
}

/** The docs base a variant's links hang off, e.g. "docs/1.0". */
export function scopedBase(base: string, prefix: string): string {
	return prefix ? `${base.replace(/\/$/, "")}/${prefix}` : base;
}
