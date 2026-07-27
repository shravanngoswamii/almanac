---
title: From a template to a framework
description: This project spent a while arguing that docs sites do not need a framework. Here is the argument, why it lost, and what changed as a result.
heroImage: "./images/from-template-to-framework.png"
pubDate: 2026-07-26
tags: ["philosophy", "astro"]
---

Almanac started life as Flect, a documentation template. Its whole pitch was that
you did not need a framework: clone the repository, read every component in an
afternoon, and own the result outright. No plugin API, no theme to fight, nothing
hidden in `node_modules`.

I still think that argument is correct about a specific failure mode. It was
wrong about what to build.

## The argument, stated fairly

Every framework makes a bet: its abstractions will save you more time than they
cost when you need to go around them. That bet pays off early and gets
progressively harder to evaluate.

The evidence is not hypothetical. Docusaurus is the most mature player in this
space, and its own source records the cost. The webpack `Configuration` type sits
in its public plugin contract, so adding Rspack support required an entire
abstraction package. Its sidebar validation carries two comments reading
`TODO unsafe` because Joi cannot express mutually recursive schemas. Its
versioning documentation opens by advising you not to use versioning. There is
still a directory shipping compatibility shims for a Markdown syntax migration.

None of that is incompetence. It is the accumulated interest on abstractions that
were reasonable when they were introduced.

So the template bet was: skip the abstraction, keep the code small enough to read.

## Why it lost

Two reasons, and neither is about code quality.

**A template cannot be maintained on your behalf.** The moment someone clones it,
their copy and yours diverge silently forever. A bug fixed upstream reaches
nobody. That is not a smaller version of a framework's update problem, it is the
absence of any update mechanism at all.

**The interesting problem was never the docs site.** What I actually wanted was
documentation where code runs. Quarto does that for Python, R, and Julia. MyST and
Jupyter Book do it for Python. Documenter does it for Julia. Nothing does it for
JavaScript and TypeScript, which is where I write.

Executing code needs a build step that owns the content pipeline, a cache with a
carefully chosen key, and a place for output to go. You cannot deliver that as a
directory of files someone copies. It is a framework whether you call it one or
not.

## What changed, concretely

The lesson from Docusaurus was not "avoid frameworks." It was "these specific
decisions cost real money." So they became rules:

- **No bundler types in any public contract.** Astro already owns Vite
  configuration, and the framework never exposes it.
- **Zod, not Joi.** Sidebars nest arbitrarily. `z.lazy()` expresses that, and a
  typo in your config fails the build with the exact path of the problem.
- **Versioning will keep the familiar URL layout and throw away the snapshot.**
  Copying every Markdown file per version is what makes versioned sites slow and
  hostile to contributors.
- **Overrides wrap, never eject.** Astro slots do this natively. There is no
  ejection path to maintain, and therefore no table of which components are safe
  to eject.
- **Cache keys designed before the first line of the cache.** Code, language,
  runtime version, dependencies. Adding a field invalidates everything, which is
  the correct trade.

## What survived

The look. Every theme, every component, the terminal player, the whole design
system came across unchanged. It was the best part of the template and it did not
need the argument to be right.

The other thing that survived is the instinct behind the original pitch: you
should be able to read the thing you depend on. The framework is a few thousand
lines. Its sidebar resolution is a pure function with tests you can read in a
sitting. When something surprises you, the answer is in a file, not in a
five-year-old design discussion.

That was always the useful half of the claim. The other half, that you therefore
should not ship a framework, does not follow.
