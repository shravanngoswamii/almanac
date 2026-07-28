# create-almanac

Scaffolds a new [Almanac](https://www.npmjs.com/package/almanac) documentation
site.

```bash
npm create almanac@latest my-docs
cd my-docs
npm run dev
```

Also works with the other package managers, and it detects which one you used:

```bash
pnpm create almanac my-docs
yarn create almanac my-docs
bun create almanac my-docs
```

## What it writes

A small tree, deliberately:

```
my-docs/
  astro.config.mjs      the Almanac config, and yours to own
  src/content.config.ts the two collections
  src/pages/index.astro a homepage to rewrite or delete
  docs/
    index.md
    guides/writing.md
  public/favicon.svg
```

Nothing is hidden in a template directory you cannot read. The routes, layouts,
components, themes, and search wiring come from the `almanac` package and update
when you update the dependency.

The scaffold is lean on purpose: it installs what every site needs and nothing
more. Executable code, MyST syntax, PDF output, versioning, and translations are
each a flag away, and each names the optional dependency it wants.

Full documentation: **https://shravangoswami.com/almanac/**

MIT licensed.
