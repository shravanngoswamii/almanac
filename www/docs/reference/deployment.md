---
title: Deployment
description: The included GitHub Actions workflows, the BASE_PATH variable, and enabling analytics.
---

## GitHub Actions workflows

Two workflows under `.github/workflows/` handle deployment to GitHub Pages:

- **Main-branch deploy** runs on pushes to your main branch. It installs dependencies, runs `npm run build`, and publishes the resulting `dist/` output to the `gh-pages` branch.
- **PR preview deploy/cleanup** runs on pull requests. When a PR is opened or updated, it builds the site with a preview-specific base path and deploys it to a subfolder on `gh-pages` so reviewers can click through a live preview. When the PR is closed, a second job removes that preview subfolder again.

Both workflows use `npm run build`, so every deploy includes a full Pagefind reindex. Search works the same way on a preview deploy as it does in production.

## `BASE_PATH`

`astro.config.mjs` reads a `BASE_PATH` environment variable to set Astro's `base` option at build time:

```js
export default defineConfig({
	base: process.env.BASE_PATH || "/flect",
	// …
});
```

If `BASE_PATH` isn't set, it defaults to `/flect` locally. In CI, the workflows set `BASE_PATH` explicitly: the main deploy sets it to your production base path, and the PR preview workflow sets it to a per-PR subpath so preview links don't collide with the production site or with each other.

<div class="callout note">
If you rename the repository or change where the site is hosted, update the default in <code>astro.config.mjs</code> and the values the workflows pass for <code>BASE_PATH</code> together.
</div>

## Enabling analytics

Umami analytics are off by default. No tracking script is committed to the repo, and `src/config.ts` reads `umami.websiteId` from the `PUBLIC_UMAMI_WEBSITE_ID` environment variable, which is empty unless you set it.

To turn analytics on:

1. Create a website in your Umami instance and copy its website id.
2. Add a `PUBLIC_UMAMI_WEBSITE_ID` repository secret or variable in your GitHub repo's settings.
3. Make sure that variable is passed through to the build step in your deploy workflow (as an env var available to `npm run build`).

With that in place, the analytics script tag renders automatically; without it, nothing is added to the page at all.
