# Almanac: full plan and handoff document

**Status:** M1 complete. Repo live at github.com/shravanngoswamii/almanac, CI green.
**Last updated:** 2026-07-27
**Purpose:** This is the complete context for the Almanac project. It exists so the working conversation can be compacted without losing decisions, research, or rationale. Read this first before continuing any work.

---

## 1. What Almanac is

Almanac is a publishing framework for technical and scientific writing. One source tree produces documentation, a blog, and executed code output, eventually across multiple formats (web first, PDF later).

It is the successor to **flect**, an Astro documentation template built earlier in this workspace. Flect stays alive and deployed while Almanac is built.

**The stated goal:** compete with Quarto, Docusaurus, Starlight, Mintlify, Zudoku, and Documenter.jl, in a single framework.

**The honest scoping of that goal** (agreed during planning): that list is six products, each backed by a company (Meta, Mintlify Inc.) or an institution (Posit for Quarto, NSF funding for MyST, the Julia community for Documenter). A solo maintainer cannot match all six head-on. The viable strategy is a wedge nobody currently serves, with the architecture built so the rest can follow later.

**The wedge:** executable, publication-quality documentation for the JavaScript and TypeScript scientific ecosystem.

Why this gap is real:
- Quarto executes Python, R, and Julia. Its JS support is Observable-only, with no npm-native execution.
- MyST and Jupyter Book are Python and Jupyter centric.
- Documenter.jl is Julia only.
- Docusaurus, Starlight, Mintlify, and Zudoku execute nothing at all.

The flagship consumer already exists in this workspace: **mcmcjs** (Bayesian and MCMC libraries in JS, WASM Stan, plotting packages). Documentation where mcmcjs samplers actually run and chart inline is a demo none of the competitors can produce.

---

## 2. Locked decisions

These were decided explicitly and should not be relitigated without a reason.

| Decision | Choice | Rationale |
|---|---|---|
| **Name** | **Almanac** | An almanac is historically a reference book of *computed tables* (astronomical data, tide charts). That fits an execution-first publishing system better than a docs-only name. Free on npm bare name and scope. No dev tool owns it. |
| **npm identity** | `almanac`, `create-almanac`, `@almanac/*` | All verified free (see section 4). |
| **Content format** | MyST-first, plain Markdown always works, MDX as an optional web-only escape hatch | MyST gives a persistent document AST, which is the precondition for PDF output. MDX compiles straight to JSX, a one-way door to HTML. |
| **Repository** | New monorepo, migrate flect in | Clean history for a new product. Flect repo stays live and unbroken until Almanac can replace it. |
| **Core stack** | TypeScript document pipeline, Astro demoted to "the web renderer" | See section 7. Not Rust: the wedge requires executing JS, and the AST and renderer ecosystem is TypeScript. Two ecosystems solo is how this dies. |
| **Visual identity** | Keep flect's look | The 42-theme system, components, and design are the differentiator. They become Almanac's default theme. |
| **Positioning copy** | Rewrite after the framework is real | Flect's current README, FAQ, landing page, and one blog post actively argue *against* being a framework. That copy gets rewritten once there is something honest to describe, not before. |

---

## 3. Origin: why the pivot happened

Flect was built as a "no framework, no lock-in" Astro template: every component hand-written and readable, nothing hidden behind a plugin API. That positioning is baked into its README, its FAQ, its landing page search joke, and a blog post titled "Why Flect doesn't use a docs framework."

The pivot was triggered by comparing flect against **Nimbus** (Cloudflare's Astro docs framework, found in this workspace). Nimbus occupies exactly the space flect was trying to carve out, with a company behind it. The conclusion: a template cannot compete with a platform, so either accept being a small template or become a real framework.

The user chose to become a real framework, then broadened the goal beyond docs to include blog, i18n, versioning, and Quarto-style code execution, then questioned whether Astro was even the right base for that.

---

## 4. Name research (complete, do not redo)

### Ruled out

| Name | Why |
|---|---|
| `flect` | Published on npm: `flect@1.6.0`, GPL-3.0, 26 versions, deprecated, a 2kb reactive components library. Owner: enzoaicardi (enzo.aicardi@gmail.com). Deprecated packages can *sometimes* be transferred via npm dispute process, but see next row. |
| `@flect` scope | Taken. `@flect/core@4.1.0` exists, so even winning the bare name would not give `@flect/docs`. This is what killed the flect name for a multi-package framework. |
| `flectra` | Established open-source ERP forked from Odoo. 10,000+ users, flectrahq.com, GitHub and GitLab orgs. Hard brand collision. |
| `foliate` | Free on npm and the best metaphor (to number the leaves of a book; the folio/quarto/octavo family, a deliberate nod to Quarto). But it collides with Foliate, a well-known GNOME ebook reader shipping on Flathub and Snap. Adjacent domain, muddies search. Runner-up. |

### Taken on npm (checked, all unavailable)

refract, facet, quire, tessera, colophon, vellum, ligature, galley, recto, folio, codex, penumbra, umbra, lucent, lumina, aperture, zenith, lattice, trellis, mosaic, weave, loom, alloy, isotope, quanta, ripple, prism, lumen, halo, octavo, manifold, palimpsest, deckle, marginalia, errata, albedo, parallax, spectra, strata, axiom, lemma, corollary, apparatus, monograph, compendium, gazette, scribe, quill, imprint, tome, slate, abacus, kernel, focal, spectral, quires, glint, gleam, sheen, lustre, patina, nacre, mica, opal, beryl, quartz, folia, folium, libris, verso, stanza, mesa, helix, plinth, obelisk, stele, rubric, gloss, glossa, incipit, vellichor, lodestar, bindery, signature, flexo, foliant, scriptorium, pagina, luminal, atelier, codexa, apparat, bibliotheca, biblio, claritas, lucida, lumo, lumis, verity, prosaic, docsmith, scriptor, scripta, inkwell, typeset, docent, lamina, laminar, polymath, tessellate, vantage, pagelet, treatise, digest, primer, handbook, compendia

### Free on npm (if a rename is ever needed)

**almanac** (chosen), foliate, chapbook, letterpress, elucid, codicil, claria, caustic, warp, foliata, colophony, axiomat, proseline, codicology, leaflets, sexto, quarto-js, quarto-web, create-flect, flect-docs, flectjs, flect-kit, flectkit, useflect, flect-press, flect-site

### Scope availability

`@almanac`, `@foliate`, `@docent`, `@flectra`, `@lamina` all returned 0 packages in npm search, so scopes appear claimable. Note that a bare name being taken does not imply the matching scope is taken.

---

## 5. Competitive research

### 5.1 Nimbus (Cloudflare)

`@cloudflare/nimbus-docs` v0.8.2, pre-1.0, explicitly "work in progress". Located at `../nimbus`.

- **Stack:** Astro 7, Sätteri (Rust markdown processor, not unified/remark), Tailwind v4, React 19 optional, Shiki.
- **Model:** three tiers, documented in their CLAUDE.md with a "boundary test" for where new code belongs:
  1. framework (npm, invisible plumbing)
  2. starter source (copied into user repo, owned and editable)
  3. registry (opt-in recipes via `nimbus-docs add <slug>`, 18 feature recipes)
- **Monorepo:** `packages/nimbus-docs` (framework, 109 files), `packages/nimbus-starter-source`, `packages/create-nimbus-docs`, `apps/www`.
- **Size markers:** `_internal/sidebar.ts` is 1431 lines, `integration.ts` is 907 lines, 26 UI component directories.
- **Theming:** light/dark only. `--nb-*` custom properties in oklch, exposed to Tailwind v4 via the CSS-first `@theme` directive. No Tailwind config file for tokens. Dark mode via `[data-mode="dark"]` set by an inline script reading `localStorage["ui-mode"]`.
- **Has:** Pagefind search, per-page OG images (astro-og-canvas), sidebar, breadcrumbs, pagination, TOC, versioned docs with alternates, agent surfaces (`/llms.txt`, `/llms-full.txt`, per-page markdown twins, AgentDirective component), sitemap, a bespoke prose/MDX lint engine, changesets releases, CI with typecheck and tests.
- **Lacks:** no blog, no RSS. Docs-only.
- **Quality:** 55 test files using Node's built-in test runner. Strict TS (`noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`). No Biome, ESLint, or Prettier anywhere. Only one TODO in the whole codebase.
- **History:** 115 commits, 2026-07-15 to 2026-07-24.
- **Novel:** templates distributed via an orphan git branch tagged per release (`templates-v<version>`), fetched with giget.

**Takeaway for Almanac:** the three-tier ownership model is worth copying. The agent-first surfaces (llms.txt) are cheap and differentiating. Their scope (docs only, one theme) is narrower than ours.

### 5.2 Docusaurus (Meta)

Located at `../docusaurus`. The most valuable findings are its scars, not its features.

**Package topology:** 39 published packages. Core is `@docusaurus/core` (126 files, ~13.2k lines). `docusaurus-types` (1,465 lines of .d.ts) is the entire public contract. Content plugins: `plugin-content-docs` (40 files, ~7,000 lines), `plugin-content-blog` (23 files, ~4,100 lines), `plugin-content-pages`. `theme-classic` is the largest package at 220 files / ~13k lines.

**Critical structural flaw to avoid:** `theme-classic` depends on the content plugins' types, so the theme is coupled to plugin data shapes. Their "core does not know about plugins" boundary is only nominally clean.

**Plugin contract:** a factory `(context: LoadContext, options) => Plugin`, plus static methods on the module (`validateOptions`, `validateThemeConfig`, `getSwizzleConfig`, `getSwizzleComponentList`).

**Lifecycle, in execution order:**
1. `loadContent()` returns arbitrary content, all plugins in parallel.
2. `getTranslationFiles` then `translateContent` returns a translated copy. `translateThemeConfig` is `Object.assign`ed into shared config, flagged in their code as `// TODO dangerous legacy, need to be refactored!`
3. `contentLoaded({content, actions})` is the only way content becomes pages. Three actions: `addRoute`, `createData` (writes JSON to disk, returns a path), `setGlobalData`.
4. `allContentLoaded({allContent, actions})` is the cross-plugin phase, keyed `allContent[pluginName][pluginId]`.
5. Route sorting, codegen, bundling, then `postBuild`.

**Versioning:** lives entirely in the docs plugin, not core (correct, transfers directly). On-disk layout:
```
docs/                                   current version, serves at /docs/next/*
versions.json                           ["1.1.0","1.0.0"], newest first
versioned_docs/version-1.1.0/           latest, serves at /docs/* with no version segment
versioned_docs/version-1.0.0/           serves at /docs/1.0.0/*
versioned_sidebars/version-1.1.0-sidebars.json
```
`docusaurus docs:version X` is a filesystem snapshot: copy the whole docs tree, serialize the sidebar, prepend to versions.json. Nothing is diffed or deduplicated, so **N versions means N full copies of every Markdown file**, and each version re-runs the entire MDX pipeline. Their own versioning documentation opens with a warning telling you not to use it unless you must.

**i18n:** one build per locale (`docusaurus build --locale fr` produces a separate site). Layout under `i18n/<locale>/`: `code.json` in Chrome-i18n format for UI strings, per-plugin JSON for sidebar labels, and whole translated Markdown documents. Resolution uses `getContentPathList` returning `[localizedPath, sourcePath]`, so a localized file shadows the original and untranslated files silently fall back. Explicit non-goals: no locale auto-detection, no translated slugs.

**Swizzling (component override):** bundler alias shadowing, not a plugin API. Core globs every file under each theme's `getThemePath()` and builds `@theme/X`, `@theme-original/X`, `@theme-init/X` aliases. Governed by a hand-maintained 445-line table in `theme-classic/src/getSwizzleConfig.ts` marking each component safe / unsafe / forbidden for eject and wrap. Their own docs warn that ejecting unsafe components makes upgrades harder.

**Config:** Joi throughout, `configValidation.ts` is 677 lines. Core owns error formatting; plugins own only their schema, via a curried `validate(schema, options)`. Severity knobs worth copying: `onBrokenLinks`, `onBrokenAnchors`, `onBrokenMarkdownLinks`, `onBrokenMarkdownImages`, `onDuplicateRoutes`, each `'ignore' | 'log' | 'warn' | 'throw'`. Staged migration namespaces worth copying: `future.v4.*` and `future.experimental_faster.*`.

**Documented warts (from their own TODOs and docs):**
- webpack's `Configuration` type is in the public plugin contract. Adding Rspack required an entire `@docusaurus/bundler` abstraction package plus threading `currentBundler` through context.
- Absolute filesystem paths leak into generated modules (two separate `// TODO Docusaurus v4` comments).
- MDX v1 to v3 migration debt: a whole `mdx1Compat/` directory still ships.
- MDX loader caching is non-deterministic; they write a synthetic dependency file to force invalidation and call it imperfect.
- Sidebar validation has two `// TODO unsafe` holes because **Joi cannot express mutual recursion** (`sidebars/validation.ts:114`).
- Plugin ordering is resolved by numeric route `priority`, and duplicate routes are a config severity setting rather than something prevented.
- Multi-instance plugin ids (`community_versioned_docs`, `globalData[name][id]`) are pervasive because they were retrofitted.

---

## 6. Verified ecosystem (npm, versions confirmed 2026-07-26)

The "Quarto in TypeScript" stack already exists as composable packages. This is why the ambitious version of Almanac is tractable.

| Package | Version | Role |
|---|---|---|
| `mystmd` | 1.10.1 | MyST toolchain |
| `myst-parser` | 1.7.3 | Markdown to typed AST |
| `myst-transforms` | 1.3.50 | Cross-references, citations, numbering |
| `myst-to-typst` | 0.0.38 | AST to Typst (PDF path) |
| `myst-to-tex` | 1.0.46 | AST to LaTeX |
| `myst-to-react` | 1.3.1 | Reference web renderer |
| `myst-cli` | 1.10.1 | CLI |
| `myst-spec` | 0.0.5 | Spec types |
| `@myriaddreamin/typst.ts` | 0.7.0 | Compile Typst to PDF from JS |
| `pyodide` | 314.0.3 | Python in WASM |
| `webr` | 0.6.0 | R in WASM |
| `@jupyterlab/services` | 7.5.10 | Real Jupyter kernel protocol client |

---

## 7. Architecture

### The core insight

Astro alone cannot reach the Quarto or Documenter tier for one specific reason: **MDX compiles markdown directly to JSX, which is a one-way door to HTML.** Multi-format output (PDF, LaTeX, JATS, slides) requires a persistent document AST that can be traversed and rendered N ways.

So Almanac's core is a document pipeline. Astro becomes one renderer among several, and a very good one for the web.

### Layers

```
Layer 0  parse      myst-parser  ->  typed AST        (own the IR, never JSX)
Layer 1  execute    JS/TS native -> Pyodide -> WebR -> Jupyter kernels
                    cache keyed on code + deps + engine version
Layer 2  enrich     cross-refs, citations, numbering, index, API extraction
Layer 3  render     web  -> Astro   (flect's themes and components = default theme)
                    pdf  -> myst-to-typst -> typst.ts
                    later: tex, docx, slides, JATS
```

### Design rules (derived from the research above)

These are hard rules. Each one exists because a mature framework paid for violating it.

1. **Never put bundler config in the plugin or integration contract.** Docusaurus's `configureWebpack` forced an entire abstraction package when Rspack arrived. Astro's `updateConfig({vite})` already covers this.
2. **Zod, not Joi.** Sidebars are mutually recursive. Joi cannot express that, which is why Docusaurus's sidebar validation has two unsafe holes. `z.lazy()` handles it and matches Astro content collections.
3. **The theme must not depend on content plugin types.** This is Docusaurus's biggest structural compromise.
4. **Keep a two-phase content lifecycle.** Per-collection load, then a cross-collection phase. Astro genuinely lacks the second one, and versioning, i18n, search indexing, and sitemap all need "everything else's content."
5. **Wrapping-only component overrides. Never ship an eject path.** Astro slots give wrapping natively. Docusaurus's eject requires a hand-maintained 445-line safety table and their own docs discourage it.
6. **Versioning: keep Docusaurus's URL and directory conventions, kill the full-copy snapshot.** Users already understand `versions.json` and `versioned_docs/version-X/`. Back old versions with a git-ref or overlay loader storing only changed files. Same URLs, a fraction of the build cost. This is a genuine differentiator.
7. **i18n in a single build.** Docusaurus's one-build-per-locale is a webpack-era constraint with an open TODO. Astro does locale-prefixed routes in one build. Keep their filesystem conventions (localized directory shadows source, untranslated files fall back).
8. **Decide multi-instance identity on day one.** Retrofitting plugin ids is why Docusaurus has `addPluginIdPrefix` and double-keyed global data everywhere.
9. **Presets must be validatable.** Docusaurus presets are unvalidated functions that hand-roll unknown-key errors.
10. **Execution caching is designed up front, never bolted on.** Key on code + language + declared deps + engine version, into a durable artifact store. Docusaurus's only cache-invalidation story is a synthetic dependency file they call imperfect.
11. **The web renderer consumes a normalized document object, not raw MDX-to-JSX.** Small discipline in M1, saves a rewrite at M3.
12. **Publish few packages.** Docusaurus publishes 39 and pays for it in cross-version compatibility. Start with two.

---

## 8. Repository layout

New monorepo at `/home/seeker/Work/Weekend-Projects/flect/almanac`, pnpm workspaces, git initialized.

```
almanac/
  package.json              workspace root, private, scripts + biome + typescript
  pnpm-workspace.yaml       packages/*, starter, www
  tsconfig.base.json        strict, noUncheckedIndexedAccess, verbatimModuleSyntax
  biome.json                tabs, double quotes (matches flect conventions)
  .gitignore
  packages/
    almanac/                the framework
      package.json          name: almanac, exports map, files: ["src"]
      src/
        index.ts            default export: the Astro integration
        integration.ts      astro:config:setup wiring
        config/schema.ts    Zod config schema           [WRITTEN]
        content/
          schemas.ts        docsSchema, blogSchema      [WRITTEN]
          loaders.ts        docsLoader, blogLoader      [WRITTEN]
          index.ts          barrel                      [WRITTEN]
        themes/             port of flect's theme registry
        vite/               virtual modules
        components/         ported from flect
        layouts/            ported from flect
        routes/             injected routes
        styles/global.css   ported from flect
        utils/
    create-almanac/         scaffolder CLI
  starter/                  canonical owned source tree, copied by the CLI
  www/                      the dogfooded site (flect's site moves here)
```

### Packaging decisions

- **Ship raw `src/`, no build step.** `.astro` components cannot be meaningfully precompiled for consumers. Starlight and Nimbus both ship source. The integration adds the package to `vite.ssr.noExternal` so Vite processes it. Astro's config loader handles TS from node_modules for the integration entry itself.
- **Exports map:** `.` (integration), `./content`, `./components`, `./themes`, `./styles/global.css`, `./package.json`.
- **The package never imports Astro virtual modules** (`astro:content`). It exports `docsLoader()` / `docsSchema()` and the user calls `defineCollection` themselves. This keeps the package independently type-checkable and matches Starlight's convention.

### Config surface (implemented in `config/schema.ts`)

```ts
almanac({
  title, tagline?, description?, author?, logo?, favicon,
  social: { github?, sponsor?, x?, bluesky?, mastodon?, discord?, email? },
  editUrl?,                                  // "https://github.com/o/r/edit/main/{path}"
  docs:   { enabled=true, path="docs", base="docs", sidebar?, pager=true,
            toc:{minDepth=2,maxDepth=3}, lastUpdated=false },
  blog:   { enabled=false, path="blog", base="blog", postsPerPage=8,
            rss=true, readingTime=true, tags=true },
  theme:  { default="almanac-light", include="all"|string[], customCss=[] },
  search: { provider: "pagefind"|"none" },
  head:   HeadTag[],
  components: Record<string,string>,         // override map, wrapping only
  onBrokenLinks:  "ignore"|"log"|"warn"|"throw",
  onBrokenAnchors: same,
  future: { myst=false, execute=false },     // M3 and M2 opt-in flags
})
```

Sidebar items are recursive and support: a bare string doc id, `{doc, label?, badge?}`, `{link, label, external?}`, `{label, items[], collapsed?}`, and `{autogenerate:{directory, collapsed?}}`.

Docs frontmatter: `title`, `description?`, `slug?`, `sidebar:{label?,order?,badge?,hidden}`, `tableOfContents?`, `editUrl?`, `lastUpdated?`, `prev?`, `next?`, `template:"doc"|"splash"`, `draft`, `head[]`.

Blog frontmatter: `title`, `description`, `pubDate`, `updatedDate?`, `tags[]`, `heroImage?`, `heroAlt?`, `authors[]`, `draft`, `head[]`.

---

## 9. Milestones

Each milestone must ship something usable. No milestone is allowed to be pure refactoring.

### M1: web renderer (COMPLETE)
Astro integration, Zod config, docs and blog collections, theme system, components, dogfooded by www.
- [x] Monorepo skeleton (pnpm workspace, tsconfig.base, biome, gitignore, git init)
- [x] `packages/almanac/package.json` with exports map
- [x] `config/schema.ts`: Zod config with recursive sidebar, severity knobs, future flags
- [x] `content/schemas.ts`, `content/loaders.ts`, `content/index.ts`
- [x] `themes/registry.ts`: 42-theme registry with `almanac-*` ids and `selectThemes()` filtering
- [x] `vite/virtual-modules.ts`: `virtual:almanac/config`, `/themes`, `/components`
- [x] `integration.ts`: validate config, register the Vite plugin, inject routes, Pagefind at `astro:build:done`
- [x] `utils/sidebar.ts`: explicit and autogenerated sidebar resolution, pure and unit tested
- [x] Components, layouts, and styles ported; nav and themes now config driven
- [x] Injected routes: docs, blog index, blog post, blog tags, rss.xml, 404, og.png, robots.txt
- [x] `www/` builds against the package (21 pages)
- [x] `starter/` tree, kept building in CI so a fresh site is never broken
- [x] `create-almanac` CLI with template sync, package rename, and package-manager detection
- [x] 46 unit tests, CI running lint, format, typecheck, test, and both site builds

**Known gaps carried into M2:** www docs content still needs to describe Almanac
rather than Flect. Blog posts are still flect-era. `docs.toc` depths,
`docs.lastUpdated`, `docs.pager`, `theme.customCss`, `head`, `editUrl`, and
`onBrokenLinks` are accepted and validated by the schema but not yet consumed by
the renderer.

### M2: execution (the wedge)
JS and TS fenced code blocks execute at build time, output embedded. Durable cache keyed on code + language + deps + engine version. mcmcjs as the flagship demo.

### M3: MyST AST
Adopt `myst-parser` and `myst-transforms`. Cross-references, citations, numbering. This is where `future.myst` flips on. The web renderer must already consume a normalized document object by this point.

### M4: PDF
`myst-to-typst` plus `@myriaddreamin/typst.ts`. One source, web and print.

### M5: more runtimes
Pyodide, then WebR, then real Jupyter kernels via `@jupyterlab/services`.

### M6: parity features
Docs versioning (overlay loader, not snapshots) and i18n (single build, locale-prefixed routes). Deliberately last: these are table stakes, not differentiators.

---

## 10. Current state of flect (the thing being ported)

**Repo:** github.com/shravanngoswamii/flect, live at https://shravangoswami.com/flect/
**HEAD:** `66e00bc` "center the landing page section headers to match the hero"
**Status:** fully working, deployed, CI green. Do not break it.

### Inventory to port

| Area | Files | Notes |
|---|---|---|
| Styles | `src/styles/global.css` (2654 lines) | Single stylesheet, all design tokens |
| Themes | `src/utils/themes.ts` (448 lines) | 42 themes = 21 families x 2 modes. `buildTokens()` derives a full token set from a 4-color seed; `buildThemesCss()` emits CSS at build time |
| Layouts | `BaseLayout.astro` (499), `BlogPost.astro` (184), `DocsLayout.astro` (139) | |
| Components | BackToTop, BlogCard, Logo, PromptCast, Search, ShareLinks, TableOfContents, icons/GitHubIcon, icons/HeartIcon | |
| Pages | `docs/[...slug]`, `blog/[...page]`, `blog/[...slug]`, `blog/tags/index`, `blog/tags/[tag]`, `index`, `404`, `og.png.ts`, `robots.txt.ts`, `rss.xml.js`, `docs/reference/changelog.astro` | |
| Utils | `ogImage.ts` (satori + resvg), `readingTime.ts`, `slug.ts`, `lib/paths.ts` (`withBase`) | |
| Config | `config.ts` (siteConfig), `data/navigation.ts`, `content.config.ts` | Becomes the Almanac config schema |
| Content | 9 docs pages, 4 blog posts, 4 hero images | Moves to `www/` |
| Assets | `assets/logoMark.ts`, `public/logo-light.svg`, `logo-dark.svg`, `favicon.svg`, `public/casts/` | |

### Key implementation details worth preserving

- **Theme system:** `<html>` carries two attributes. `data-mode` is binary light/dark and drives Shiki and asciinema dual-theme switches. `data-theme` is the specific theme id. Generated theme rules match **both** attributes (`html[data-mode="x"][data-theme="y"]`) because matching `data-theme` alone loses a specificity fight against the base `:root[data-mode="dark"]` rule.
- **Code blocks:** Shiki dual-theme (`github-light` / `github-dark`), but background overridden to `var(--code-bg)` so it matches the active theme. Only syntax colors come from Shiki's per-span vars.
- **Asciinema:** `PromptCast.astro` uses a custom player theme bound to site CSS tokens, so the terminal follows the active theme. The container reserves exact space via `padding-top: calc(29.215% + 32px)` to prevent layout shift on load (measured, accurate to within 0.03px from 320px to 1440px).
- **Base path:** the live site deploys under `/flect`. All internal links use `withBase()`. Builds must run `BASE_PATH=/flect npm run build` to catch base-path bugs.
- **Prose:** justified with hyphenation, except paragraphs containing inline code (`.prose p:has(code)` falls back to ragged-right, because long unbreakable code tokens create ugly word gaps).

### Theme submission (separate, already done)

`../theme-submission/` holds 6 images for the Astro theme directory, 2560x1440, 3.3MB total: cover, homepage light, theme picker, themes grid ("40+ built-in themes"), homepage dark, blog. Generated with headless Chrome via puppeteer-core, composed from HTML files. These describe flect-the-template and will need redoing if flect is superseded.

---

## 11. Working conventions

These were established across the flect sessions and carry over.

- **No em dashes.** Anywhere: prose, copy, comments, commit messages. Rewrite with a period, comma, colon, or parentheses. This is a hard rule.
- **No unicode arrow characters** in UI. Use inline SVG icons.
- **Commits:** one logical change each. Concise, casual, lowercase, no prefixes like `feat:`, no emoji, no co-author or trailer lines. If a change touches a shared file alongside an unrelated change, split them: revert to HEAD, reapply one change, diff-check against the intended final state, commit, then reapply the rest.
- **Comments:** default to none. Write one only when the *why* is genuinely non-obvious (a workaround, a hidden constraint). Never restate what the code says.
- **Verification before claiming done:** typecheck, build, `check:all`, and an actual look at rendered output. For anything visual or theme-related, check default light and dark plus one or two genuinely different themes (Dracula, Sepia), because a fix can look correct by coincidence on the default theme alone.
- **Screenshots:** headless Chrome via `puppeteer-core` driving `/usr/bin/google-chrome`, viewport at `deviceScaleFactor: 2`. Emulate `prefers-color-scheme` for light/dark; set `data-mode` and `data-theme` on `<html>` for specific themes. ImageMagick (`magick`) for cropping and montages.

---

## 12. Open questions

Not yet decided, flagged so they are not silently assumed:

1. **Does flect keep existing after Almanac ships?** Current plan leaves it live and untouched. It could later become "the minimal starter" or be archived and redirected.
2. **Astro theme directory submission:** flect's submission was prepared but not submitted. Submit flect now, or wait and submit Almanac?
3. **The `almanac` npm name should be claimed soon.** It is free today. A placeholder 0.0.0 publish would reserve it.
4. **Multi-format scope for v1:** is PDF a v1 requirement or a post-1.0 goal? This affects how hard M3 is pushed.
5. **GitHub org:** `almanac` org availability on GitHub is unchecked. Repo could live under the personal account.

---

## 13. Where to pick up

Next concrete step is finishing M1's framework package, in this order:

1. Port `src/utils/themes.ts` from flect into `packages/almanac/src/themes/`, renaming theme ids `flect-*` to `almanac-*`.
2. Write `packages/almanac/src/vite/virtual-modules.ts`: serve `virtual:almanac/config` and the component override map.
3. Write `packages/almanac/src/integration.ts`: validate config, register the Vite plugin, inject docs and blog routes, add `noExternal`, run Pagefind at `astro:build:done`.
4. Write `packages/almanac/src/index.ts` re-exporting the integration as default.
5. Port components, layouts, and `global.css`.
6. Stand up `www/` consuming the package, then verify against flect's live output.

Run `pnpm install` at the monorepo root first: no dependencies have been installed yet.
