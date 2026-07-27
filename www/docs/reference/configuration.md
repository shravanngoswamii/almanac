---
title: Configuration reference
description: Every option the almanac() integration accepts, its default, and what is not wired up yet.
---

All configuration is the object you pass to `almanac()` in `astro.config.mjs`. It is parsed with Zod, so an unknown shape or a bad type fails the build with the path of the problem (`docs.toc.maxDepth: Number must be less than or equal to 6`) instead of rendering a broken page.

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import almanac from "almanac";

export default defineConfig({
	site: "https://example.com",
	integrations: [almanac({ title: "My Project" })],
});
```

`title` is the only required option.

## Site

| Option | Type | Default | Controls |
| --- | --- | --- | --- |
| `title` | string | required | Header brand, page titles, OG image, RSS feed title |
| `tagline` | string | none | Footer line and the fallback meta description |
| `description` | string | none | Meta description and OG image body copy; falls back to `tagline`, then `title` |
| `author.name` | string | none | Footer copyright line |
| `author.url` | URL | none | Link on the footer author name |
| `favicon` | string | `"/favicon.svg"` | Favicon path |
| `logo.light` / `logo.dark` / `logo.alt` | string | none | Reserved for a custom logo |
| `social.github` | URL | none | Header and footer GitHub links |
| `social.sponsor` | URL | none | Header and footer "Support" links; omit and they disappear |
| `social.x` / `bluesky` / `mastodon` / `discord` / `email` | string | none | Reserved |
| `editUrl` | string | none | Reserved template for edit links, for example `"https://github.com/o/r/edit/main/{path}"` |
| `head` | array | `[]` | Reserved list of extra head tags |

## `docs`

| Option | Type | Default | Controls |
| --- | --- | --- | --- |
| `enabled` | boolean | `true` | Whether the docs route is injected at all |
| `path` | string | `"docs"` | Directory on disk, relative to the project root |
| `base` | string | `"docs"` | URL segment the docs are served under; `""` serves them at the site root |
| `sidebar` | array | omitted | Explicit navigation; leave it out to group by directory |
| `pager` | boolean | `true` | Previous/next links |
| `toc.minDepth` / `toc.maxDepth` | 1 to 6 | `2` / `3` | Heading depths in the table of contents |
| `lastUpdated` | boolean | `false` | Reserved last-updated line |

## `blog`

| Option | Type | Default | Controls |
| --- | --- | --- | --- |
| `enabled` | boolean | `false` | Whether the blog routes are injected. Off by default: a docs site without a blog is the common case |
| `path` | string | `"blog"` | Directory on disk |
| `base` | string | `"blog"` | URL segment |
| `postsPerPage` | integer | `8` | Posts per index page |
| `rss` | boolean | `true` | Injects `/rss.xml` |
| `readingTime` | boolean | `true` | Reading time on cards and posts |
| `tags` | boolean | `true` | Injects `/<base>/tags/[tag]` pages |

## `theme`

| Option | Type | Default | Controls |
| --- | --- | --- | --- |
| `default` | string | `"almanac-light"` | Theme used before a visitor picks one |
| `include` | `"all"` or string[] | `"all"` | Which themes ship and appear in the picker. Entries can be full ids or family names; the `almanac` family is always kept |
| `customCss` | string[] | `[]` | Reserved list of extra stylesheets |

See [Theming](../../guides/theming/) for the full list of theme ids.

## `search`

| Option | Type | Default | Controls |
| --- | --- | --- | --- |
| `provider` | `"pagefind"` or `"none"` | `"pagefind"` | Whether the post-build index is generated. See [Search](../../guides/search/) |

## Overrides and flags

| Option | Type | Default | Controls |
| --- | --- | --- | --- |
| `components` | record | `{}` | Maps a built-in component name to your own `.astro` file. Accepted names: `Header`, `Footer`, `Sidebar`, `TableOfContents`, `Pager`, `Search`, `ThemePicker`, `Logo`, `BlogCard`, `PageTitle` |
| `onBrokenLinks` | `ignore` / `log` / `warn` / `throw` | `"warn"` | Reserved severity for broken internal links |
| `onBrokenAnchors` | same | `"warn"` | Reserved severity for broken anchors |
| `future.myst` | boolean | `false` | Reserved: parse through a MyST AST instead of straight to HTML |
| `future.execute` | boolean | `false` | Reserved: run fenced code blocks and embed their output |

Unfinished subsystems ship behind `future` flags first, so a minor release can't move the ground under a site that is already published.

## Sidebar entries

An entry is one of five shapes, and categories nest:

```js
docs: {
	sidebar: [
		"index",                                                    // a doc id
		{ doc: "start/installation", label: "Install" },             // relabelled doc
		{ link: "https://astro.build", label: "Astro" },              // external link
		{ label: "Guides", items: ["guides/search"], collapsed: true }, // category
		{ autogenerate: { directory: "reference", collapsed: true } }, // whole directory
	],
}
```

Any entry may carry a `badge` string. Ids that don't match a page are dropped rather than failing the build. With `sidebar` omitted, pages are grouped by their top-level directory, root-level pages first, sorted by frontmatter `sidebar.order` and then alphabetically.

Page-level options live in frontmatter instead; see [Writing docs](../../guides/writing-docs/).

## Not wired up yet

These options validate and are documented above as reserved, but the current web renderer ignores them. They are listed here so you can tell a no-op from a mistake:

- `logo`, `favicon` (the layout serves `/favicon.svg` directly), `head`, `editUrl`, and every `social` field except `github` and `sponsor`.
- `theme.customCss`.
- `components`. The map is validated and a virtual module is generated from it, but the built-in layouts still import their own components directly, so an override has no effect today.
- `docs.pager` (the pager always renders), `docs.toc` depths (fixed at `##` and `###`), and `docs.lastUpdated`.
- `blog.postsPerPage` (the index paginates at 8) and `blog.readingTime` (always shown).
- `onBrokenLinks` and `onBrokenAnchors`: there is no link checker yet.
- `future.myst` and `future.execute`: nothing reads them.
