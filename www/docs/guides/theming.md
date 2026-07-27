---
title: Theming
description: How the color system, dark mode toggle, and theme-color meta tag work together.
---

## The color system

All colors live in `src/styles/global.css` as CSS custom properties, split into a light theme under `:root` and a dark theme under `:root[data-theme="dark"]`:

```css
:root {
	--bg: #fbfaf7;
	--surface: #ffffff;
	--text: #151816;
	--muted: #626b65;
	--line: #dfe5df;
	--accent: #14724b;
	--accent-strong: #0c5135;
	/* … */
}

:root[data-theme="dark"] {
	--bg: #101413;
	--surface: #171d1a;
	--text: #f4f1ea;
	--muted: #b9c2bb;
	--line: #2f3832;
	--accent: #6ee7b7;
	--accent-strong: #dcfce7;
	/* … */
}
```

Every component in the template reads colors from these variables (`--bg`, `--surface`, `--text`, `--muted`, `--line`, `--accent`, and a few more), so retheming the whole site is a matter of editing the values in one place rather than hunting through components.

## How the toggle works

The theme toggle button in the header writes either `"dark"` or `"light"` to `localStorage` under the key `theme`, and sets a `data-theme` attribute on the `<html>` element to match. CSS selectors like `:root[data-theme="dark"]` key off that attribute to swap the custom property values.

To avoid a flash of the wrong theme on load, an inline script in `BaseLayout.astro` runs before first paint: it reads the stored preference (falling back to the OS-level `prefers-color-scheme`) and applies `data-theme` immediately, before the rest of the page renders.

## `themeColor` vs. the CSS accent

`src/config.ts` also has a `themeColor` field:

```ts
themeColor: {
	light: "#14724b",
	dark: "#101413",
},
```

These two values only drive the browser's `<meta name="theme-color">` tag, the color a mobile browser uses to tint its own UI chrome (the address bar, task switcher card, etc.). They have no effect on the page's actual CSS.

<div class="callout note">
Because `themeColor` and the CSS `--accent` value are set in two different places, keep them in sync by hand whenever you change your accent color: update both `src/config.ts` and the `--accent` values in `src/styles/global.css` together.
</div>
