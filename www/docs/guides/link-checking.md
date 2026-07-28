---
title: Link checking
description: Almanac checks internal links and heading anchors against the built site, and you choose whether a broken one warns or fails the build.
---

Documentation rots through its links first. A page gets renamed, six others keep
pointing at the old URL, and nobody notices until a reader does.

Almanac checks every internal link when the build finishes. It is on by default
at `warn`.

## What gets checked

Two things, configured separately:

```js
almanac({
	title: "My Project",
	onBrokenLinks: "throw",
	onBrokenAnchors: "warn",
})
```

`onBrokenLinks` covers `<a href>` targets that resolve to no page.
`onBrokenAnchors` covers `#fragment` targets that no element on the destination
page carries, including fragments on the current page.

Both accept four values:

| Value | Effect |
|---|---|
| `"ignore"` | Skip the check entirely. No work is done |
| `"log"` | Report at info level |
| `"warn"` | Report as a warning, the default |
| `"throw"` | Fail the build |

`"throw"` is the right setting for CI once your links are clean. Getting there
first is easier at `"warn"`.

## What gets skipped

External links are not fetched. Anything with a scheme (`https:`, `mailto:`,
`tel:`) or a protocol-relative host (`//cdn.example.com`) is left alone. A
checker that hit the network would make every build depend on the whole
internet's uptime, and it would be slow enough that you would turn it off.

## Why it runs on the output

The check reads the emitted HTML rather than your Markdown. That is deliberate:
a link can be broken by a `slug` override, a `base` path, or a redirect that
only exists after the build, and those are exactly the breakages that reach
production. Checking sources would miss all three and would also flag links that
are actually fine.

It also means the checker sees links your content did not write, like the ones
in the header, sidebar, and pager. When Almanac itself generates a bad link, this
catches that too.

Relative hrefs are resolved the way a browser resolves them, against the page's
own directory. Trailing slashes are treated as interchangeable, so `/docs/guide`
and `/docs/guide/` both find the same page.

## Reading the report

Each entry names the page the link was written on and the href exactly as it
appeared:

```
[WARN] [almanac] 2 broken links:
  /docs/start/quick-start/ -> ../../guides/gone/
  /blog/hello/ -> /docs/removed/
```

The href is unresolved on purpose. Seeing `../../guides/gone/` rather than
`/guides/gone/` tells you what to search for in your source.
