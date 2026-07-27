import config from "virtual:almanac/config";
import { getTheme, modeOf, oppositeMode } from "./themes/registry.ts";

/**
 * Presentational view of the validated config, in the shape the layouts and
 * components consume. Keeping this mapping in one place means the config
 * schema can evolve without touching every template.
 */

const defaultId = config.theme.default;
const defaultTheme = getTheme(defaultId);
const siblingTheme = getTheme(oppositeMode(defaultId));
const lightTheme = modeOf(defaultId) === "light" ? defaultTheme : siblingTheme;
const darkTheme = modeOf(defaultId) === "dark" ? defaultTheme : siblingTheme;

export const siteConfig = {
	name: config.title,
	tagline: config.tagline ?? "",
	description: config.description ?? config.tagline ?? config.title,
	author: config.author?.name ?? "",
	authorUrl: config.author?.url ?? "",
	githubUrl: config.social.github ?? "",
	githubSponsorsUrl: config.social.sponsor ?? "",
	favicon: config.favicon,
	editUrl: config.editUrl ?? "",
	themeColor: {
		light: lightTheme?.swatch ?? "#14724b",
		dark: darkTheme?.bg ?? "#101413",
	},
	umami: {
		src: import.meta.env.PUBLIC_UMAMI_SRC ?? "https://cloud.umami.is/script.js",
		websiteId: import.meta.env.PUBLIC_UMAMI_WEBSITE_ID ?? "",
	},
};

export { config };
export default siteConfig;
