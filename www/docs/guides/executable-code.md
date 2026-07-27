---
title: Executable code
description: Run JavaScript and TypeScript blocks at build time and embed their output.
sidebar:
  order: 5
---

Almanac can run a fenced code block during the build and put its output on the
page. This is opt-in, because executing code is a bigger commitment than
rendering it.

Turn it on in `astro.config.mjs`:

```js
almanac({
	title: "My Project",
	future: { execute: true },
})
```

Then mark a block with `exec`:

````md
```js exec
const rows = [1, 2, 3].map((n) => n ** 3);
console.log(rows.join(", "));
```
````

Which renders the source followed by its result:

```js exec
const rows = [1, 2, 3].map((n) => n ** 3);
console.log(rows.join(", "));
```

TypeScript works too, with types stripped before running:

```ts exec
interface Point {
	x: number;
	y: number;
}

const distance = (a: Point, b: Point): number =>
	Math.hypot(b.x - a.x, b.y - a.y);

console.log(distance({ x: 0, y: 0 }, { x: 3, y: 4 }));
```

## Errors do not break the build

A block that throws reports the failure in place and the build carries on, so
one broken example cannot stop you shipping:

```js exec
JSON.parse("{ not valid json }");
```

## Options

Add these to the fence after `exec`:

| Option | What it does |
|---|---|
| `hide-code` | Show only the output |
| `hide-output` | Run the block but render nothing |
| `timeout=5000` | Override the 30 second default, in milliseconds |

A block that only sets something up can hide its output:

```js exec hide-output
globalThis.__unused = "this block runs but shows nothing";
```

## Caching

Results are cached in `.almanac/exec/`, keyed by a hash of the code, the
language, the runtime version, and any declared dependencies. An unchanged block
is never run twice, and a Node upgrade invalidates every entry, because output
that depends on the runtime should not survive it.

Commit the cache directory to make CI builds reproducible and fast, or leave it
out of version control and let CI cache it.

## What is not here yet

Only JavaScript and TypeScript run today. Python via Pyodide, R via WebR, and
real Jupyter kernels are planned. Blocks in a language without a runner render
as ordinary code, so nothing breaks while you wait.
