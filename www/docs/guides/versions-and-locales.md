---
title: Versions and translations
description: Publish older documentation versions and translations without copying your whole docs tree, in one build.
---

Older versions and other languages are the same problem twice: a directory that
shadows your docs, served under a URL prefix, whose missing pages fall back to
what they shadow. Almanac treats them as one mechanism, which is why neither one
requires copying your content.

## Versions

Declare them newest first:

```js
almanac({
	title: "My Project",
	versions: [
		{ name: "1.0", label: "1.0 (old)" },
	],
})
```

Then create `versioned_docs/version-1.0/` and put in it **only the pages that
version changed**:

```
docs/
  index.md
  guides/writing.md
  guides/theming.md
versioned_docs/
  version-1.0/
    index.md          <- the only page 1.0 changed
```

That gives you:

| URL | Content |
| --- | --- |
| `/docs/` | current `docs/index.md` |
| `/docs/1.0/` | `versioned_docs/version-1.0/index.md` |
| `/docs/guides/writing/` | current |
| `/docs/1.0/guides/writing/` | inherited from current, not copied |

The inheritance is the point. Docusaurus snapshots every file for every version,
which is why [its own documentation opens by suggesting you avoid
versioning](https://docusaurus.io/docs/versioning). Here an old version costs a
directory holding its differences, and adding a version does not multiply your
repository.

The trade is honest: an inherited page shows the current text under an old
version's URL. If a page changed, branch it. If it did not, inheriting is
correct and free.

## Translations

```js
almanac({
	title: "My Project",
	i18n: {
		defaultLocale: "en",
		locales: [
			{ code: "en", label: "English" },
			{ code: "fr", label: "Français" },
			{ code: "ar", label: "العربية", dir: "rtl" },
		],
	},
})
```

Translations live in `i18n/<code>/docs/`, mirroring your docs tree:

```
docs/index.md
i18n/fr/docs/index.md     <- translated
                          <- everything else falls back to English
```

The default locale keeps its plain URLs. Others are prefixed: `/docs/fr/`. An
untranslated page falls back to the default locale rather than 404ing, so a
partial translation is a usable site from the first file.

Each page declares its own `lang`, and a locale marked `dir: "rtl"` sets the
direction on the html element so the browser lays the page out correctly.

## Both at once

Versions and locales combine. `/docs/fr/1.0/guides/writing/` resolves in order
of specificity: the French 1.0 file, then the French current file, then the
English 1.0 file, then the English current file. The first one that exists wins.

## The picker

A version and language selector appears in the docs sidebar when either feature
is configured. Switching keeps you on the same page when it exists in the target
variant, and lands on that variant's home page when it does not, because sending
a reader to a 404 is worse than sending them one level up.

Like every other component, it can be replaced:

```js
almanac({
	components: { VariantPicker: "./src/components/MyPicker.astro" },
})
```

## Limitations worth knowing

- **PDFs are only generated for the current version in the default locale.** A
  variant page can share its source file with the page it inherits from, and the
  Markdown processor is handed a file path with no way to tell which variant it
  is rendering, so a variant PDF would silently be a copy of another one. The PDF
  link is hidden on variant pages rather than pointing at something wrong.
- **Search indexes everything.** Pagefind sees every variant, so a search can
  return the 1.0 page and the current one. Scoping search per variant needs an
  index per variant, which is not built.
- **Only docs are versioned or translated.** The blog is not.
- **UI strings are not translated.** "On this page", "Edit this page", and the
  rest are English. Only your content is localized.
