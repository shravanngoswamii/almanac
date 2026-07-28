---
title: Executable code
description: Run JavaScript, TypeScript, and Python blocks at build time and embed their output.
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

## Python

Python runs too, through [Pyodide](https://pyodide.org/). It is an optional peer
dependency, so install it only in projects that want it:

```sh
npm install pyodide
```

Then a `python` block behaves like any other:

````md
```python exec
import statistics

samples = [12, 15, 9, 22, 17]
print("mean:  ", statistics.mean(samples))
print("stdev: ", round(statistics.stdev(samples), 3))
```
````

```python exec
import statistics

samples = [12, 15, 9, 22, 17]
print("mean:  ", statistics.mean(samples))
print("stdev: ", round(statistics.stdev(samples), 3))
```

The whole Python standard library is available. Third party packages are not
installed for you yet, so `numpy` and friends need Pyodide's own package loading,
which Almanac does not drive.

Pyodide starts in about a second, and it starts once per block that actually
runs. Cached blocks cost nothing, so this shows up on the first build and then
mostly disappears.

Python runs in its own process for the same reason JavaScript does, and it
matters more here: a WASM runtime cannot be interrupted from the thread it runs
on, so an infinite loop would hang the build rather than time out.

## What is not here yet

R via WebR and real Jupyter kernels are not built. Blocks in a language without
a runner render as ordinary highlighted code, so nothing breaks while you wait.

Failures that are the environment's fault rather than the code's, a runtime that
is not installed, a driver that dies, a timeout, are never cached. A Python
traceback is cached, because the code really does raise it.
