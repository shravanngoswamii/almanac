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
| `logo.light` / `logo.dark` / `logo.alt` | string | none | Image paths that replace the built-in mark. Give both modes and CSS swaps them with no flash |
| `social.github` | URL | none | Header and footer GitHub links |
| `social.sponsor` | URL | none | Header and footer "Support" links; omit and they disappear |
| `social.x` / `bluesky` / `mastodon` / `discord` / `email` | string | none | Icon links in the footer. `email` accepts a bare address and gets a `mailto:` prefix |
| `editUrl` | string | none | Template for "Edit this page" links, for example `"https://github.com/o/r/edit/main/{path}"`. Without `{path}` the source path is appended |
| `head` | array | `[]` | Extra tags in every page's `<head>`. Pages can add their own with frontmatter `head` |

## `docs`

| Option | Type | Default | Controls |
| --- | --- | --- | --- |
| `enabled` | boolean | `true` | Whether the docs route is injected at all |
| `path` | string | `"docs"` | Directory on disk, relative to the project root |
| `base` | string | `"docs"` | URL segment the docs are served under; `""` serves them at the site root |
| `sidebar` | array | omitted | Explicit navigation; leave it out to group by directory |
| `pager` | boolean | `true` | Previous/next links |
| `toc.minDepth` / `toc.maxDepth` | 1 to 6 | `2` / `3` | Heading depths in the table of contents |
| `lastUpdated` | boolean | `false` | Adds a last-updated line, dated from the file's last git commit. Needs full history, so set `fetch-depth: 0` in CI |

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
| `customCss` | string[] | `[]` | Extra stylesheets, linked after the framework's own so they win |

See [Theming](../../guides/theming/) for the full list of theme ids.

## `search`

| Option | Type | Default | Controls |
| --- | --- | --- | --- |
| `provider` | `"pagefind"` or `"none"` | `"pagefind"` | Whether the post-build index is generated. See [Search](../../guides/search/) |

## Overrides and flags

| Option | Type | Default | Controls |
| --- | --- | --- | --- |
| `components` | record | `{}` | Maps a built-in component name to your own `.astro` file. Accepted names: `Header`, `Footer`, `Sidebar`, `TableOfContents`, `Pager`, `Search`, `ThemePicker`, `Logo`, `BlogCard`, `PageTitle` |
| `onBrokenLinks` | `ignore` / `log` / `warn` / `throw` | `"warn"` | What to do about internal links that resolve to no page. Checked against the built output when the build finishes |
| `onBrokenAnchors` | same | `"warn"` | Same, for `#fragment` targets that no element on the destination page carries |
| `future.myst` | boolean | `false` | Parse through a MyST AST: cross references, numbered figures, directives, roles. See [MyST syntax](../../guides/myst/) |
| `future.execute` | boolean | `false` | Run fenced blocks marked `exec` and embed their output. See [Executable code](../../guides/executable-code/) |

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

Nothing. Every option on this page is honoured by the renderer.

Two features inside `future.myst` are partial, and the [MyST guide](../../guides/myst/) says so on the page: citations parse but have no bibliography renderer, and cross references resolve within a page rather than across pages.
