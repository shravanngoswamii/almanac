---
title: MyST syntax
description: What the MyST pipeline adds on top of Markdown, and what still works exactly as before.
---

(myst-intro)=

This starter has `future.myst` on, so Markdown is parsed into a MyST AST instead
of straight to HTML. Everything below renders because of that.

## Cross references that write their own text

Put a target above anything and link to it with an empty label. The text comes
from whatever you referenced:

- A section: [](#myst-intro)
- A figure, numbered automatically: [](#fig-shapes)

```md
(myst-intro)=
## A section

Link to it with [](#myst-intro) and the heading text fills itself in.
```

## Numbered figures

:::{figure} https://placehold.co/600x200/14724b/ffffff/png?text=Almanac
:label: fig-shapes
:alt: A placeholder image

A caption. The number in front of it is assigned during the build.
:::

## Directives

Admonitions are directives rather than raw HTML:

:::{note}
This is a `{note}` directive. There are also `tip`, `warning`, `caution`,
`important`, and `danger`.
:::

:::{warning}
Directive bodies are full Markdown, so **bold**, `code`, and [links](#myst-intro)
all work inside them.
:::

## Math

Inline math like $E = mc^2$, and display math:

$$
\int_0^1 x^2 \, dx = \frac{1}{3}
$$

## Roles

Inline roles cover the small things: {abbr}`MyST (Markedly Structured Text)`
renders an abbreviation with a tooltip.

## Executable blocks still work

Both syntaxes run. The MyST-native one is `{code-cell}`:

```{code-cell} js
const rows = [2, 3, 5, 7, 11];
console.log("primes:", rows.join(", "));
console.log("sum:", rows.reduce((a, b) => a + b, 0));
```

And the plain fence with `exec` behaves the same, so content moves between the
two modes unchanged:

```js exec
console.log("this ran during the build, under MyST");
```

## What did not change

Ordinary Markdown is untouched: headings, lists, tables, links, images, and
fenced code all parse the way they always did. Raw HTML still passes through.
Turning `future.myst` off leaves every page on this site rendering, minus the
directives and cross references above.
