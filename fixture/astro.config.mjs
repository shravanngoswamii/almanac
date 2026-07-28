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
						items: ["index", "guides/writing", "guides/myst"],
					},
				],
			},
			// On here so every CI build exercises the MyST pipeline. Turn it off
			// and the same content still renders, through remark instead.
			versions: [{ name: "1.0", label: "1.0 (old)" }],
			i18n: {
				defaultLocale: "en",
				locales: [
					{ code: "en", label: "English" },
					{ code: "fr", label: "Français" },
				],
			},
			future: { myst: true, execute: true, pdf: true },
		}),
	],
});
