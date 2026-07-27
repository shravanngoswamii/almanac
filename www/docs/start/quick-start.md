---
title: Quick start
description: The short list of things to change once Almanac is installed.
---

Once Almanac is [installed](../installation/) and the dev server runs, here's the order to work through to turn the starting point into your own site. Almost all of it happens in `astro.config.mjs`.

## 1. Set the site identity

The integration's options drive the header, the meta tags, the footer, and the OG image:

```js
almanac({
	title: "My Project",
	tagline: "Short line under the title.",
	description: "Used for meta tags and the OG image.",
	author: { name: "You", url: "https://example.com" },
	social: {
		github: "https://github.com/you/your-project",
		sponsor: "https://github.com/sponsors/you",
	},
})
```

Every field is listed in the [Configuration reference](../../reference/configuration/).

## 2. Shape the sidebar

Either describe the navigation explicitly:

```js
docs: {
	sidebar: [
		{ label: "Get started", items: ["index", "start/installation"] },
		{ autogenerate: { directory: "reference" } },
	],
}
```

Or delete `sidebar` entirely and let Almanac group pages by their top-level directory. See [Writing docs](../../guides/writing-docs/) for how both modes resolve.

## 3. Pick a theme

`theme.default` is the theme a first-time visitor sees, and `theme.include` narrows what the picker offers:

```js
theme: { default: "almanac-light", include: ["dracula", "nord"] }
```

All 42 built-in ids are listed in [Theming](../../guides/theming/).

## 4. Decide whether you want a blog

The blog is off by default, because a docs site without one is the common case:

```js
blog: { enabled: true, tags: true, rss: true }
```

With it on, posts live in a top-level `blog/` directory and the blog index, tag pages, and `/rss.xml` are all injected for you.

## 5. Replace the favicon

The layout serves `/favicon.svg`, so drop your own file at `public/favicon.svg`. The header and footer logo is a built-in mark, not a file you supply.

## 6. Write your first real page

Create a `.md` file under `docs/`, give it a `title` in its frontmatter, and the route exists. If you configured an explicit `sidebar`, add the page's id to it too, otherwise the page is reachable by URL but invisible in the navigation.

## Next steps

- [Writing docs](../../guides/writing-docs/) covers routing, frontmatter, callouts, and sidebars.
- [Configuration reference](../../reference/configuration/) documents every option and its default.
- [Deployment](../../reference/deployment/) covers `site`, `base`, and static hosting.
