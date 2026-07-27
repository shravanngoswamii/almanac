---
title: Introduction
description: What Almanac is, what works today, and what is still on the roadmap.
---

Almanac is a publishing framework for technical and scientific writing. It ships as an Astro integration: you install it from npm, configure it in `astro.config.mjs`, and write Markdown in a top-level `docs/` directory. One source tree produces a documentation site and a blog, and eventually executed code output and print formats.

This site is built with Almanac, so what you are reading is the framework rendering its own documentation.

## What works today

- **Docs routing**: every Markdown file under `docs/` becomes a page, with no per-file layout wiring and no route to add.
- **Sidebars**: group pages explicitly in config, or leave `sidebar` out and Almanac groups them by directory. See [Writing docs](guides/writing-docs/).
- **A previous/next pager** at the foot of each docs page, ordered by the sidebar.
- **A table of contents** built from each page's `##` and `###` headings, with scroll-spy highlighting of the section you're reading.
- **Instant search** powered by [Pagefind](guides/search/), on a header button and `Cmd+K`. No external service, no API key.
- **A blog** with tags, an RSS feed, hero images, and reading times. Off by default, turned on with `blog.enabled`.
- **42 built-in themes**, a light/dark toggle, and a theme picker. See [Theming](guides/theming/).
- **A build-time OG image** rendered with [Satori](https://github.com/vercel/satori), plus JSON-LD structured data and a generated `robots.txt`.
- **Copy-to-clipboard code blocks**: every fenced block gets a copy button.
- **An optional terminal-recording player**, [`<PromptCast />`](guides/terminal-demos/), for documenting CLIs.
- **Config validated with Zod**, so a typo fails the build with the path of the problem instead of rendering a broken page.

## What is planned but not built

Almanac is early. The web renderer is the only layer that exists today. The following are designed, and some are already named in the config, but none of them are implemented, so don't plan around them yet:

- **Executable code blocks.** Running fenced JavaScript and TypeScript at build time and embedding the output is the point of the project. The `future.execute` flag is reserved for it, defaults to `false`, and currently does nothing.
- **MyST parsing.** `future.myst` is in the same state: reserved, off, inert. Markdown is parsed by Astro today.
- **PDF and other print output.** Not started.
- **Internationalization and docs versioning.** Both are on the roadmap, neither exists.

## Where the pieces live

Almanac is a package you depend on, not a repository you clone. Two things belong to you: `astro.config.mjs`, which holds the config, and the content directories (`docs/`, plus `blog/` if you enable it). Everything else, the routes, layouts, components, themes, and search wiring, comes from the package and updates when you update the dependency.

## Next steps

- [Installation](start/installation/) covers both a new site and adding Almanac to an existing Astro project.
- [Quick start](start/quick-start/) is the short list of things to change to make the site yours.
- [Configuration reference](reference/configuration/) documents every option, its default, and what is not wired up yet.
