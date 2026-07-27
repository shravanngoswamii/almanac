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
			docs: { enabled: true, path: "docs", base: "docs" },
			blog: { enabled: true, path: "blog", base: "blog" },
			theme: { default: "almanac-light" },
			search: { provider: "pagefind" },
		}),
	],
});
