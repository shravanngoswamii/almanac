---
title: Search
description: How the built-in Cmd+K search works and how it's indexed.
---

Flect ships with instant search powered by [Pagefind](https://pagefind.app/). No external search service or API key required.

## How the index is built

Pagefind indexes the site during `npm run build`, not `npm run dev`. The `build` script runs an Astro build first, then points Pagefind at the resulting `dist/` folder to crawl the rendered HTML and generate the search index:

```sh
astro build && pagefind --site dist
```

Because indexing happens against built HTML, there is no live index while you're running the dev server.

## Opening search

The search modal can be opened three ways:

- Clicking the search button in the site header
- Pressing `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux) anywhere on the site
- Tapping the search icon in the mobile menu

## Controlling what gets indexed

Two data attributes control what Pagefind picks up:

- `data-pagefind-body` marks a region as indexable content. It's already set on the main docs content area, so page bodies are searchable out of the box.
- `data-pagefind-ignore` excludes an element from the index entirely. It's already set on chrome-like regions (the header, footer, sidebar navigation, and mobile panels), so nav links and repeated UI text don't clutter search results.

You generally don't need to touch either attribute unless you're adding new full-page chrome that shouldn't be searchable, or new content areas that should be.

## Trying it locally

<div class="callout warning">
Running `npm run dev` and testing the search box won't return results: there's no index yet. Build first.
</div>

```sh
npm run build && npm run preview
```

This builds the site (including the Pagefind index) and serves it exactly as it would run in production, so you can confirm search is working before you deploy.
