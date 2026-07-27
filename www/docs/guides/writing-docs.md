---
title: Writing docs
description: How pages, frontmatter, headings, and callouts work in Flect.
---

## Pages live in the docs collection

Every `.md` file under `docs/` at the project root is an entry in the `docs` content collection, defined in `src/content.config.ts`. A single catch-all route at `src/pages/docs/[...slug].astro` renders every entry through `DocsLayout`, so adding a page means creating a file and writing frontmatter. There's no per-file layout wiring and no relative path to compute.

For example:

- `docs/index.md` → `/docs/`
- `docs/guides/writing-docs.md` → `/docs/guides/writing-docs/`
- `docs/reference/configuration.md` → `/docs/reference/configuration/`

Add a new file in the right folder and the route exists automatically. (You still need a sidebar entry; see [Updating the sidebar](#updating-the-sidebar) below.)

## Required frontmatter

Every docs entry needs exactly two frontmatter fields, validated by the schema in `src/content.config.ts`:

```md
---
title: Your page title
description: A one-sentence summary shown under the title and used for the OG image.
---
```

That's it: no `layout` field to point at `DocsLayout.astro`. The catch-all route applies the layout once, so nesting a page more deeply never changes what its frontmatter looks like.

`title` and `description` both show up in the page header, in the browser tab title, in the generated OG image, and in the JSON-LD breadcrumb data, so keep them short and accurate.

## Headings populate the table of contents

The right-hand table of contents on every docs page is generated automatically from the page's Markdown headings. You don't maintain it by hand. Just write normal `##` and `###` headings and they'll appear in order.

## Linking between docs pages

Link to other docs pages with a path relative to the current page, not a root-relative one:

```md
See [Theming](../guides/theming/) for the color system.
```

Flect is typically deployed under a base path, `/flect` by default (see [Deployment](../../reference/deployment/)). A relative link resolves correctly under any base path automatically; a root-relative link like `/docs/guides/theming/` would silently skip the base path and 404 in production.

## Callouts

Wrap a paragraph in a `<div>` with class `callout note` or `callout warning` to render a styled admonition box (the styles already exist in `src/styles/global.css`):

```md
<div class="callout note">
Notes are for helpful context that isn't essential to follow the main instructions.
</div>

<div class="callout warning">
Warnings are for things that can break a build or cause data loss if skipped.
</div>
```

## Updating the sidebar

Adding a page doesn't automatically add it to navigation. You also need a matching entry in `src/data/navigation.ts` (inside the right `NavGroup`'s `items` array), or the page will be reachable by direct URL but invisible in the sidebar. See the [Configuration reference](../../reference/configuration/) for the exact shape of that file.
