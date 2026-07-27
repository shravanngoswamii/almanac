---
title: Announcing Flect
description: A lightweight, fully hand-built Astro documentation template with no framework underneath it. Sidebar navigation, instant search, and dark mode, all in plain Astro you own outright.
heroImage: "./images/announcing-flect.png"
pubDate: 2026-06-15
tags: ["announcement", "astro"]
---

Flect is out. It's a documentation template built on Astro, and the short version is: there's no docs framework hiding underneath it. No Starlight, no third-party docs library, no plugin API to learn. Just plain Astro components, one CSS file, and a handful of small scripts, all of which you can read start to finish in an afternoon.

That last part is the point. Most documentation templates give you something that looks great out of the box and then gets harder to change the moment you need something the framework didn't anticipate. You end up reading someone else's abstraction to figure out how to override a single component, or shipping a workaround because the "right" extension point doesn't exist yet. Flect is built the other way around: it starts as a small, readable codebase, and you're expected to open the files and change them directly.

## What's in the box

The core of Flect is a content collection of Markdown files, rendered through a single catch-all route and one layout. Add a file, add a navigation entry, done. There's no config schema to satisfy beyond frontmatter's `title` and `description`. On top of that:

- **Sidebar navigation with groups**, defined in one typed file (`src/data/navigation.ts`) instead of scattered across page frontmatter.
- **An auto-generated table of contents**, built from each page's headings at render time.
- **Cmd+K instant search**, powered by [Pagefind](https://pagefind.app/): no external search service, no API key, no monthly bill.
- **A dark/light theme toggle** that persists across reloads and respects the OS-level preference on first visit.
- **A responsive layout** where the sidebar and table of contents collapse into slide-out panels on small screens, rather than just disappearing.
- **Copy-to-clipboard code blocks**, generated automatically for every fenced code block in your Markdown.
- **Deploy workflows already wired up** for GitHub Pages, including PR preview builds.

None of this is groundbreaking on its own. What's different is that all of it fits in a codebase small enough to hold in your head, and none of it is behind an abstraction you don't control.

## Where it came from

Flect's design and component set started as the documentation site for [gitflect](https://github.com/shravanngoswamii/gitflect), a Rust CLI by the same author, and grew into something worth pulling out and reusing. That history shows up in a few places (the terminal-cast player exists because a CLI's docs benefit from showing real command output, not just static code blocks), but the template itself is generic. It works just as well for a JavaScript library, an internal tool, or, as of this post, its own blog.

## Try it

```sh
git clone https://github.com/shravanngoswamii/flect.git
cd flect
npm install
npm run dev
```

That's the whole setup. From there, the [installation guide](../../docs/start/installation/) walks through the handful of files worth editing first: `src/config.ts` for your site's name and description, `src/data/navigation.ts` for your sidebar, and `src/styles/global.css` if you want a different accent color. Everything else is optional.
