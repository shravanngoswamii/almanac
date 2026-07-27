---
title: Configuration reference
description: Every field on siteConfig and the shape of the navigation data file.
---

## `src/config.ts`

Everything the template pulls from a single place lives on the exported `siteConfig` object.

| Field | Controls | Example / default |
| --- | --- | --- |
| `name` | Site name shown in the header brand, page titles, and OG images | `"Flect"` |
| `tagline` | Short one-line description used on the homepage hero and in meta tags | `"A lightweight, fully custom Astro documentation template."` |
| `description` | Longer description used for the default meta description and OG image body copy | `"Flect is a hand-built Astro documentation template with sidebar navigation, instant search, dark mode, and optional terminal-cast demos, with no framework lock-in."` |
| `githubUrl` | Target of the header's GitHub link | `"https://github.com/shravanngoswamii/flect"` |
| `githubSponsorsUrl` | Target of the header's "Support" link; set to a falsy value to hide the link entirely | `"https://github.com/sponsors/shravanngoswamii"` |
| `themeColor.light` | The `<meta name="theme-color">` value used in light mode (mobile browser chrome tint) | `"#14724b"` |
| `themeColor.dark` | The `<meta name="theme-color">` value used in dark mode | `"#101413"` |
| `umami.src` | Script URL for [Umami](https://umami.is/) analytics; reads `PUBLIC_UMAMI_SRC` at build time | `"https://cloud.umami.is/script.js"` |
| `umami.websiteId` | Your Umami website id; reads `PUBLIC_UMAMI_WEBSITE_ID` at build time. Left empty, analytics are skipped entirely and no script tag is rendered | `""` |

<div class="callout note">
See <a href="../../guides/theming/">Theming</a> for how <code>themeColor</code> relates (and doesn't relate) to the CSS <code>--accent</code> variable, and <a href="../deployment/">Deployment</a> for how the Umami environment variables get set in CI.
</div>

## `src/data/navigation.ts`

The sidebar is driven by two exports:

```ts
interface NavItem {
	title: string;
	href: string;
}

interface NavGroup {
	title: string;
	items: NavItem[];
}

export const navGroups: NavGroup[] = [
	{
		title: "Get started",
		items: [
			{ title: "Introduction", href: "/docs/" },
			// …
		],
	},
	// …
];

export const quickLinks = navGroups.flatMap((group) => group.items);
```

- `navGroups` is an array of `NavGroup`s. Each group renders as a labeled section in the sidebar, and each `NavItem` renders as a link inside it.
- `quickLinks` is derived automatically by flattening every group's items into a single list. It's used where the template needs a flat list of docs pages (for example, cross-page navigation). Don't edit `quickLinks` directly; add or remove entries in `navGroups` and it updates on its own.

Adding a new docs page means adding a matching `NavItem` to the right group here. See [Writing docs](../../guides/writing-docs/).
