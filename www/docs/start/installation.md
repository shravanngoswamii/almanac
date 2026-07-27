---
title: Installation
description: Scaffold a new Almanac site, or add Almanac to an Astro project you already have.
---

Almanac needs Node 22.12 or newer and Astro 7.

<div class="callout note">
Almanac is pre-1.0 and moving quickly. Pin the version you install and read the release notes before bumping it.
</div>

## Start a new site

```sh
npm create almanac@latest my-docs
cd my-docs
npm run dev
```

The scaffolder writes a tree with `astro.config.mjs`, `src/content.config.ts`, and a `docs/` directory holding two example pages. That is the whole starting point.

## Add it to an existing Astro project

Install the framework and its peer dependencies. Satori and resvg render the OG image, Pagefind builds the search index:

```sh
npm install almanac satori @resvg/resvg-js pagefind
```

Register the integration:

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import almanac from "almanac";

export default defineConfig({
	site: "https://example.com",
	integrations: [
		almanac({
			title: "My Project",
			social: { github: "https://github.com/you/your-project" },
		}),
	],
});
```

Declare the collections Almanac renders. The loaders point at top-level directories, so writers never touch `src/`:

```ts
// src/content.config.ts
import { defineCollection } from "astro:content";
import { blogLoader, blogSchema, docsLoader, docsSchema } from "almanac/content";

export const collections = {
	docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
	blog: defineCollection({ loader: blogLoader(), schema: blogSchema() }),
};
```

Then write `docs/index.md` with a `title` in its frontmatter, and the route exists.

## Run the dev server

```sh
npm run dev
```

This serves the site at `http://localhost:4321`, under whichever `base` your `astro.config.mjs` sets (see [Deployment](../../reference/deployment/)).

## Build for production

```sh
npm run build
```

Astro compiles the site to static HTML, CSS, and JS in `dist/`, and then Almanac's `astro:build:done` hook runs Pagefind over that output to write the search index into `dist/pagefind/`. You don't chain the two commands yourself.

<div class="callout note">
If Pagefind can't run, the build logs a warning and finishes anyway. You get a working site without search rather than a failed deploy.
</div>

## Preview the production build

```sh
npm run preview
```

This serves `dist/`, including the search index, so you can check the real output before deploying.

<div class="callout warning">
Search only works against a production build. The dev server has no index, and the search dialog deliberately skips loading Pagefind in dev, so the box will open and return nothing. Use `npm run build && npm run preview` to test search locally.
</div>
