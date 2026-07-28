// @ts-check
import { defineConfig } from "astro/config";
import almanac from "almanac";

export default defineConfig({
	site: "https://example.com",
	integrations: [
		almanac({
			title: "My Project",
			tagline: "Documentation for my project.",
			social: {
				github: "https://github.com/you/your-project",
			},
			// Omit `sidebar` and Almanac groups pages by directory instead.
			docs: {
				sidebar: [
					{
						label: "Get started",
						items: ["index", "guides/writing"],
					},
				],
			},
			// Everything below the web page is opt-in. See the docs for
			// future.execute, future.myst, future.pdf, versions, and i18n.
		}),
	],
});
