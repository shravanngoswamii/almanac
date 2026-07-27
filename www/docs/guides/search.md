---
title: Search
description: How the built-in Cmd+K search is indexed, opened, and scoped.
---

Almanac ships instant search powered by [Pagefind](https://pagefind.app/). It runs entirely against your built HTML, so there is no external search service, no API key, and no per-query cost.

## How the index is built

The integration hooks `astro:build:done`. Once Astro has written `dist/`, Almanac shells out to Pagefind over that directory:

```sh
npx -y pagefind --site dist
```

You don't chain that yourself, and you don't add it to your `build` script. `npm run build` is enough. The result lands in `dist/pagefind/`, which the search dialog loads on first use.

Because Pagefind crawls rendered HTML rather than your source Markdown, there is no index while the dev server is running.

Turn it off with:

```js
search: { provider: "none" }
```

<div class="callout note">
If Pagefind fails (no network to fetch it, or a sandboxed CI step), the build logs a warning and still succeeds. You get a site whose search box returns nothing rather than a broken deploy, so check the build log if search goes quiet.
</div>

## Opening search

The dialog opens three ways:

- Clicking the search button in the site header
- Pressing `Cmd+K` (macOS) or `Ctrl+K` (Windows and Linux) anywhere on the site
- Tapping the search icon in the mobile menu

`Escape` closes it, as does clicking the backdrop. Pagefind's UI script and stylesheet are only fetched the first time you open the dialog, so search costs nothing on pages nobody searches from.

## Controlling what gets indexed

Two data attributes decide what Pagefind sees, and Almanac's layouts already set both:

- `data-pagefind-body` marks indexable content. It's on the main content region and on the docs article, so page bodies are searchable out of the box.
- `data-pagefind-ignore` excludes an element. It's on the header, footer, sidebar, table of contents, mobile panels, and the search UI itself, so navigation labels and repeated chrome don't crowd out real results.

You only need to touch either one if you add your own chrome that shouldn't be searchable, or a new content region that should be.

## Trying it locally

<div class="callout warning">
Running the dev server and typing in the search box returns nothing. There is no index, and the dialog skips loading Pagefind in dev on purpose. Build first.
</div>

```sh
npm run build && npm run preview
```

That builds the site including the index and serves it the way production will, so you can confirm search works before you deploy.
