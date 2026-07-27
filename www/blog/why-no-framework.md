---
title: Why Flect doesn't use a docs framework
description: Starlight is good software. Here's why Flect deliberately doesn't build on it, or on anything like it, and what that trade-off actually costs you.
heroImage: "./images/why-no-framework.png"
pubDate: 2026-07-01
tags: ["philosophy", "astro"]
---

The most common question about Flect is some version of "why didn't you just use Starlight?" It's a fair question. Starlight is good software, it's maintained by the Astro core team, and it does more than Flect does. If you want i18n out of the box, a plugin ecosystem, and a component library that's already been battle-tested across hundreds of sites, it's the right tool. This post is about why Flect exists anyway.

## The cost of an abstraction is paid later, not upfront

Every framework, docs-focused or otherwise, makes a bet: it will save you more time through its abstractions than it costs you when you need to go around them. That bet usually pays off early. Scaffolding a new project with Starlight gets you a working, good-looking docs site in minutes. Flect can't compete with that, and doesn't try to.

Where the bet stops paying off is later, when you need something specific: a custom layout for one section, a different data source for navigation, a table of contents that behaves slightly differently than the framework's default. At that point you're not writing a component anymore. You're reading the framework's source to find the extension point, checking whether it's stable across versions, and writing code that satisfies an API surface designed for the general case, not yours.

Flect skips that step by not having the abstraction in the first place. The sidebar is a `.astro` file that loops over an array. The table of contents is a `.astro` file that walks a `headings` array Astro already gives you from `render()`. There's no plugin system to route around, because there's no plugin system.

## This means real trade-offs, not just talking points

To be direct about what you give up:

- **No i18n system.** If you need multiple locales, you're building that yourself, and it's real work.
- **No component ecosystem.** There's no marketplace of drop-in cards, tabs, or admonition variants. The ones in `global.css` are what you get until you write more.
- **No plugin API**, which also means no plugins. Every feature is either already in the template or something you build.
- **Smaller community, less prior art.** When something breaks with Starlight, there's a good chance someone else already hit it and posted the fix. With Flect, you're more often the first.

If any of those matter more to you than owning the code, Starlight (or something like it) is the better choice, and that's fine. Flect isn't trying to win that comparison; it's built for the case where you'd rather read fifteen small files than learn one large framework, and where your docs site's needs are specific enough that a general-purpose abstraction would fight you more than it helps.

## What you get back

In exchange, every part of Flect is at the altitude of a normal Astro project. `src/pages/docs/[...slug].astro` is fifteen lines: get the collection, map it to static paths, render. `src/layouts/DocsLayout.astro` is the sidebar, the breadcrumbs, and the content area, laid out the way you'd lay them out if you were starting from a blank file. When you want to change how something behaves, you don't go looking for a config option that might not exist. You open the file and change it, the same way you'd change any other part of your own codebase.

That's the whole pitch. Not "faster to start," but "cheaper to change forever." Whether that trade is worth it depends entirely on how much you expect to need to change.
