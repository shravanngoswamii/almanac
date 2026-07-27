---
title: Introduction
description: What Flect is, what it gives you out of the box, and where to go next.
---

Flect is a lightweight, fully hand-built Astro documentation template. There's no docs framework underneath it: no Starlight, no third-party docs library, just Astro components, plain CSS, and a handful of small scripts. If you can read Astro, you can read (and change) every part of this template.

This very site is the template's own documentation, written using the template. What you're reading right now is dogfood: the example content _is_ the docs.

## What you get

- **Sidebar navigation with groups**, defined in a single typed file, [`src/data/navigation.ts`](reference/configuration/).
- **An auto-generated table of contents**, built from each page's markdown headings, no manual upkeep.
- **Cmd+K instant search**, powered by [Pagefind](guides/search/), with a search button in the header, a keyboard shortcut, and a mobile entry point.
- **A dark/light theme toggle**, persisted in `localStorage` so it survives reloads and new tabs. See [Theming](guides/theming/).
- **A responsive mobile nav**: the sidebar and table of contents collapse into slide-out panels on small screens.
- **Copy-to-clipboard code blocks**: every fenced code block gets a copy button for free.
- **Satori-generated OG images**: social preview images are rendered per-page at build time, no design tool required.
- **JSON-LD structured data**: breadcrumb and FAQ structured data are emitted automatically for richer search results.
- **An optional terminal-recording player**: [`<PromptCast />`](guides/terminal-demos/) plays back an asciinema `.cast` file, handy for CLI or dev-tool docs. Delete it if you don't need it.
- **Deploy workflows already wired up**: a GitHub Pages deploy for your main branch and a PR-preview deploy/cleanup workflow. See [Deployment](reference/deployment/).
- **Biome-based linting and formatting**: one fast tool instead of an ESLint + Prettier combo.

## No framework lock-in

Flect deliberately does not depend on Starlight or any other documentation framework. Pages are plain Markdown files in the `docs` content collection, rendered through a single catch-all route and layout you can read top to bottom. There's no plugin API to learn and nothing hidden behind a framework abstraction. If you want to change how a page renders, you edit the layout or route directly.

## Next steps

- [Installation](start/installation/) covers cloning the template and getting it running locally.
- [Quick start](start/quick-start/) walks through the handful of files to edit to make it yours.
