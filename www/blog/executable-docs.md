---
title: Documentation that runs its own examples
description: Why executable code blocks are the point of Almanac, how the cache decides when to re-run, and what every output on this page proves.
heroImage: "./images/executable-docs.png"
pubDate: 2026-07-25
tags: ["guide", "execute"]
---

Every code sample in documentation is a claim. Usually nobody checks it. The
sample was correct when it was written, the API changed two releases later, and
the docs kept insisting confidently.

Almanac can run the sample instead. Every output below was produced while this
page was being built.

```js exec
const version = process.versions.node;
console.log(`this page was built on Node ${version}`);
```

That is not a screenshot or a transcript. If the runtime changes, that line
changes, because it is computed rather than remembered.

## The interesting problem is caching

Running code during a build is easy. Running it only when necessary is where the
design lives, and getting it wrong makes the whole feature unusable: too eager
and every build crawls, too lazy and the page lies.

The cache key is a hash of four things:

```ts exec
const parts = ["code", "language", "engine version", "declared dependencies"];
for (const [i, part] of parts.entries()) {
	console.log(`${i + 1}. ${part}`);
}
```

Each one earns its place:

- **Code** is obvious. Edit the block, run it again.
- **Language** matters because the same text means different things as JavaScript
  and as TypeScript.
- **Engine version** matters because output can depend on the runtime. Upgrading
  Node invalidates every entry, deliberately. A cached result that outlives the
  runtime that produced it is worse than no cache.
- **Dependencies** matter for the same reason, one layer out.

Object key order is normalized before hashing, so `{a, b}` and `{b, a}` produce
the same key. Without that, the cache would miss constantly for no reason.

Results live in `.almanac/exec/`, sharded by key prefix. Commit that directory
and your CI builds become reproducible and fast. Leave it out and CI just pays
the cost once per cache lifetime.

## Errors stay in place

A block that throws does not fail the build:

```js exec
const config = JSON.parse("{ trailing: comma, }");
console.log(config);
```

The error is rendered where the output would have been, and the rest of the page
builds normally. This is a deliberate choice. A documentation build that dies
because one example is broken means you cannot ship a fix for anything else until
you fix that example first.

The failure is also counted, so the build summary reports it and you cannot miss
it in CI.

## Blocks are isolated

Each block runs in its own process, which is why an infinite loop is survivable:

```js exec timeout=500
const started = Date.now();
while (Date.now() - started < 100) {
	// deliberately busy for a moment
}
console.log("finished before the 500ms timeout");
```

Give a block a `timeout=` and it gets killed at that point with a clear message.
Without process isolation, a block that blocks the event loop or calls
`process.exit` would take the whole build down with it.

## Directives

| Directive | Effect |
|---|---|
| `exec` | Run the block and show its output |
| `hide-code` | Show only the output |
| `hide-output` | Run it, render nothing |
| `timeout=ms` | Override the 30 second default |

`hide-code` is how you show a result without the machinery that produced it:

```js exec hide-code
const now = new Date("2026-07-25T00:00:00Z");
console.log(`rendered from a block you cannot see, dated ${now.toISOString().slice(0, 10)}`);
```

## What comes next

Only JavaScript and TypeScript run today. The runner interface was written with
Pyodide, WebR, and real Jupyter kernels in mind, and a language without a runner
degrades to an ordinary highlighted block rather than an error.

The other missing piece is richer output. Text is the whole vocabulary right now.
The artifact type already allows images, SVG, HTML, and JSON, so a block that
produces a chart can eventually embed it. That is the version that makes this
genuinely useful for scientific writing, where the interesting output was never a
string.
