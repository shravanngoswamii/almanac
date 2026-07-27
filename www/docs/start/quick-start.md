---
title: Quick start
description: The short list of things to edit to make the template your own.
---

Once the template is [installed](../installation/) and running, here's the order to work through to turn it into your own site.

## 1. Update `src/config.ts`

This is the central config object (`siteConfig`). Set your site's name, tagline, description, GitHub URL, GitHub Sponsors URL, theme colors, and (if you use it) your Umami website id. See the [Configuration reference](../../reference/configuration/) for every field.

## 2. Update `src/data/navigation.ts`

This file defines the sidebar's groups and links. Add, remove, or reorder entries here to shape the docs navigation. See [Writing docs](../../guides/writing-docs/) for how new pages and nav entries need to stay in sync.

## 3. Replace the branding assets

Swap in your own:

- `public/logo-light.svg`
- `public/logo-dark.svg`
- `public/favicon.svg`

## 4. Rewrite the homepage

Edit `src/pages/index.astro` with your own hero copy, features, and calls to action.

## 5. Add your first real page

Create a new `.md` file under `docs/`, give it the right frontmatter, and add a matching entry to `src/data/navigation.ts` so it shows up in the sidebar. The [Writing docs](../../guides/writing-docs/) guide covers the frontmatter shape and routing rules in detail.

## Next steps

- [Writing docs](../../guides/writing-docs/) explains how routing, frontmatter, and callouts work.
- [Configuration reference](../../reference/configuration/) documents every `siteConfig` field and the `navigation.ts` shape.
