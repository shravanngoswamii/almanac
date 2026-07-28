import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildVariants,
	localePath,
	scopeEntries,
	scopedBase,
	stripPrefix,
	variantForId,
	versionPath,
} from "../src/content/variants.ts";
import { slugForId } from "../src/utils/sidebar.ts";

describe("buildVariants", () => {
	it("is just the base tree when nothing is configured", () => {
		const variants = buildVariants({ base: "docs" });
		assert.deepEqual(variants, [{ prefix: "", sources: ["docs"] }]);
	});

	it("puts the default variant first with no prefix, so urls never move", () => {
		const variants = buildVariants({
			base: "docs",
			versions: [{ name: "1.0" }],
			locales: [{ code: "en" }, { code: "fr" }],
			defaultLocale: "en",
		});
		assert.equal(variants[0]?.prefix, "");
	});

	it("reads the base first for a version, so unchanged pages are inherited", () => {
		const variants = buildVariants({
			base: "docs",
			versions: [{ name: "1.0" }],
		});
		const version = variants.find((entry) => entry.prefix === "1.0");
		assert.deepEqual(version?.sources, ["docs", "versioned_docs/version-1.0"]);
	});

	it("excludes the default locale, which needs no prefix", () => {
		const variants = buildVariants({
			base: "docs",
			locales: [{ code: "en" }, { code: "fr" }],
			defaultLocale: "en",
		});
		assert.deepEqual(
			variants.map((entry) => entry.prefix),
			["", "fr"],
		);
	});

	it("falls back to the original for an untranslated page", () => {
		const variants = buildVariants({
			base: "docs",
			locales: [{ code: "fr" }],
			defaultLocale: "en",
		});
		const french = variants.find((entry) => entry.prefix === "fr");
		assert.deepEqual(french?.sources, ["docs", "i18n/fr/docs"]);
	});

	it("combines a locale with a version, most specific source last", () => {
		const variants = buildVariants({
			base: "docs",
			versions: [{ name: "1.0" }],
			locales: [{ code: "fr" }],
			defaultLocale: "en",
		});
		const combined = variants.find((entry) => entry.prefix === "fr/1.0");
		assert.deepEqual(combined?.sources, [
			"docs",
			"versioned_docs/version-1.0",
			"i18n/fr/docs",
			"i18n/fr/docs/versioned_docs/version-1.0",
		]);
		assert.equal(combined?.locale, "fr");
		assert.equal(combined?.version, "1.0");
	});

	it("honours an explicit path for a version or a locale", () => {
		assert.equal(versionPath({ name: "2", path: "old/v2" }), "old/v2");
		assert.equal(
			localePath({ code: "de", path: "de-docs" }, "docs"),
			"de-docs",
		);
		assert.equal(localePath({ code: "de" }, "docs"), "i18n/de/docs");
	});
});

describe("variantForId", () => {
	const variants = buildVariants({
		base: "docs",
		versions: [{ name: "1.0" }],
		locales: [{ code: "fr" }],
		defaultLocale: "en",
	});

	it("prefers the longest matching prefix", () => {
		// "fr/1.0/x" matches both "fr" and "fr/1.0"; the longer one is right.
		assert.equal(variantForId("fr/1.0/guides/a", variants)?.prefix, "fr/1.0");
	});

	it("matches a plain id to the default variant", () => {
		assert.equal(variantForId("guides/a", variants)?.prefix, "");
	});

	it("matches a prefix used as the whole id", () => {
		assert.equal(variantForId("fr", variants)?.prefix, "fr");
	});

	it("does not match a page whose name merely starts with a prefix", () => {
		assert.equal(variantForId("french-guide", variants)?.prefix, "");
	});
});

describe("stripPrefix", () => {
	it("removes the prefix and its slash", () => {
		assert.equal(stripPrefix("fr/1.0/guides/a", "fr/1.0"), "guides/a");
	});

	it("returns nothing when the id is exactly the prefix", () => {
		assert.equal(stripPrefix("fr", "fr"), "");
	});

	it("leaves an id alone when there is no prefix", () => {
		assert.equal(stripPrefix("guides/a", ""), "guides/a");
	});
});

describe("scopeEntries", () => {
	const variants = buildVariants({
		base: "docs",
		versions: [{ name: "1.0" }],
		locales: [{ code: "fr" }],
		defaultLocale: "en",
	});
	const entries = [
		{ id: "index" },
		{ id: "guides/a" },
		{ id: "1.0/index" },
		{ id: "1.0/guides/a" },
		{ id: "fr/index" },
		{ id: "fr/1.0/index" },
	];

	it("keeps only one variant's entries and strips their prefix", () => {
		const scoped = scopeEntries(entries, variants, {
			prefix: "1.0",
			sources: [],
		});
		assert.deepEqual(
			scoped.map((entry) => entry.id),
			["index", "guides/a"],
		);
	});

	it("does not let a longer prefix leak into a shorter one", () => {
		// "fr/1.0/index" belongs to fr/1.0, not to fr.
		const scoped = scopeEntries(entries, variants, {
			prefix: "fr",
			sources: [],
		});
		assert.deepEqual(
			scoped.map((entry) => entry.id),
			["index"],
		);
	});

	it("gives the default variant the unprefixed entries only", () => {
		const scoped = scopeEntries(entries, variants, { prefix: "", sources: [] });
		assert.deepEqual(
			scoped.map((entry) => entry.id),
			["index", "guides/a"],
		);
	});
});

describe("scopedBase", () => {
	it("appends the prefix to the docs base", () => {
		assert.equal(scopedBase("docs", "1.0"), "docs/1.0");
	});

	it("leaves the base alone for the default variant", () => {
		assert.equal(scopedBase("docs", ""), "docs");
	});

	it("does not double a slash", () => {
		assert.equal(scopedBase("docs/", "fr"), "docs/fr");
	});
});

describe("slugForId", () => {
	it("drops the root index so the docs home is at the base", () => {
		assert.equal(slugForId("index"), undefined);
	});

	it("drops a variant's index so its home is at the prefix", () => {
		assert.equal(slugForId("1.0/index"), "1.0");
		assert.equal(slugForId("fr/1.0/index"), "fr/1.0");
	});

	it("leaves an ordinary page alone", () => {
		assert.equal(slugForId("guides/writing"), "guides/writing");
	});

	it("does not strip a page merely named like index", () => {
		assert.equal(slugForId("guides/indexing"), "guides/indexing");
	});
});
