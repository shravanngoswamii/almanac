---
title: Installation
description: Get the Flect template running locally in a few commands.
---

## Get the code

Either clone the repository directly:

```sh
git clone https://github.com/shravanngoswamii/flect.git
cd flect
```

Or, on GitHub, click **Use this template** on the repository page to create your own copy under your account (recommended if you're starting a new project, since it gives you a clean git history instead of a fork).

## Install dependencies

```sh
npm install
```

## Run the dev server

```sh
npm run dev
```

This serves the site at `http://localhost:4321`, under whichever base path is configured for local development (see [Deployment](../../reference/deployment/) for how `BASE_PATH` works).

<div class="callout note">
The dev server gives you fast refresh for content and components, but it does **not** build a search index. See the note below.
</div>

## Build for production

```sh
npm run build
```

This runs two steps in sequence:

1. `astro build` compiles the site into static HTML/CSS/JS in `dist/`.
2. `pagefind --site dist` crawls the freshly built `dist/` output and generates the Pagefind search index alongside it.

Both steps have to happen, in that order, for search to work: Pagefind indexes the built HTML, not your source Markdown.

## Preview the production build

```sh
npm run preview
```

This serves the contents of `dist/` (including the search index) so you can check the production build locally before deploying.

<div class="callout warning">
Search only works against the production build. If you open the dev server (`npm run dev`) and try the search box, it won't return results because no Pagefind index exists yet. Use `npm run build && npm run preview` to try search locally.
</div>
