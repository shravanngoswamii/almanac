// @ts-check
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import almanac from "almanac";

export default defineConfig({
	site: "https://shravangoswami.com",
	base: process.env.BASE_PATH || "/almanac",
	integrations: [
		sitemap(),
		almanac({
			title: "Almanac",
			tagline: "A publishing framework for technical and scientific writing.",
			description:
				"Almanac turns one source tree into documentation, a blog, and executed code output.",
			author: {
				name: "Shravan Goswami",
				url: "https://shravangoswami.com",
			},
			social: {
				github: "https://github.com/shravanngoswamii/almanac",
				sponsor: "https://github.com/sponsors/shravanngoswamii",
			},
			editUrl:
				"https://github.com/shravanngoswamii/almanac/edit/main/www/{path}",
			docs: {
				lastUpdated: true,
				enabled: true,
				path: "docs",
				base: "docs",
				sidebar: [
					{
						label: "Get started",
						items: ["index", "start/installation", "start/quick-start"],
					},
					{
						label: "Guides",
						items: [
							"guides/writing-docs",
							"guides/search",
							"guides/theming",
							"guides/terminal-demos",
							"guides/executable-code",
							"guides/myst",
							"guides/pdf",
							"guides/versions-and-locales",
							"guides/link-checking",
						],
					},
					{
						label: "Reference",
						items: ["reference/configuration", "reference/deployment"],
					},
				],
			},
			blog: { enabled: true, path: "blog", base: "blog" },
			theme: { default: "almanac-light" },
			search: { provider: "pagefind" },
			pdf: {
				book: {
					enabled: true,
					filename: "almanac-handbook.pdf",
					subtitle: "The complete documentation, as one book",
					toc: { depth: 3 },
				},
			},
			future: { myst: true, execute: true, pdf: true },
		}),
	],
});
