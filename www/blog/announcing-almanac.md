---
title: Announcing Almanac
description: A publishing framework for technical and scientific writing, where documentation, a blog, and executed code output all come from one source.
heroImage: "./images/announcing-almanac.png"
pubDate: 2026-07-27
tags: ["announcement", "astro"]
---

Almanac is a publishing framework for technical and scientific writing. You
install it, point it at a directory of Markdown, and you get a documentation
site with a sidebar, search, a table of contents, and 42 themes. You can also
mark a code block as executable, and Almanac will run it during the build and
put the real output on the page.

An almanac has always been a reference book of computed tables. Astronomical
positions, tide charts, sunrise times: numbers someone calculated and then
printed. That is the shape of this project. Prose and computation in the same
document, with the computation actually performed rather than transcribed.

## What works today

```bash
npm create almanac@latest my-docs
```

That gives you a working site immediately:

- Docs routing from a top-level `docs/` directory, with a sidebar you either
  declare explicitly or let Almanac group by directory
- Previous and next paging, and a table of contents with scroll-spy highlighting
- Instant search through Pagefind, indexed automatically after the build
- A blog with tags, an RSS feed, hero images, and reading time
- 42 themes: a default plus twelve color families and eight signature palettes,
  each in both light and dark
- Open Graph images generated at build time
- JavaScript and TypeScript code blocks that execute during the build

Two files are yours: `astro.config.mjs` for configuration, and whatever Markdown
you write. Everything else is the framework's problem.

## Executable blocks

This is the part that does not exist elsewhere in the JavaScript ecosystem.
Enable it, then mark a fence with `exec`:

```js exec
const primes = [];
for (let n = 2; primes.length < 8; n += 1) {
	if (primes.every((p) => n % p !== 0)) primes.push(n);
}
console.log(primes.join(" "));
```

The output above was produced while this page was being built. Nobody typed it
in, and it cannot drift away from the code that produced it, because the code is
the source.

Results are cached by a hash of the code, the language, the runtime version, and
any declared dependencies, so an unchanged block never runs twice. Upgrade Node
and every cached result is invalidated on purpose, because output that depends on
the runtime should not outlive it.

A block that throws reports its error in place and the build continues. One
broken example should never stop you shipping documentation.

## What is not built yet

Being direct about the gaps, because a roadmap presented as a feature list is
just a lie with better formatting:

- **MyST and a document AST.** Almanac renders to HTML today. Multi-format output
  needs a real intermediate representation, which is the next milestone.
- **PDF.** Waiting on the AST. The plan is Typst rather than LaTeX.
- **Python and R.** Only JavaScript and TypeScript execute. Pyodide and WebR are
  planned, and the runner interface already anticipates them.
- **Docs versioning and i18n.** Both deliberately last. They are table stakes,
  not differentiators, and doing them badly is worse than not doing them.

## Where it came from

Almanac began as a template called Flect, which argued fairly loudly that docs
sites did not need a framework. That argument lost, and
[the next post](../from-template-to-framework/) explains why.
