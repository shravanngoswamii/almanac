import { almanac } from "./integration.ts";

export default almanac;
export { almanac };

export {
	AlmanacConfigSchema,
	type AlmanacConfig,
	type AlmanacUserConfig,
	type SidebarItem,
	validateConfig,
} from "./config/schema.ts";

export {
	buildThemesCss,
	DEFAULT_DARK_ID,
	DEFAULT_LIGHT_ID,
	getTheme,
	type Mode,
	modeOf,
	oppositeMode,
	selectThemes,
	type Theme,
	THEMES,
} from "./themes/registry.ts";

export {
	OVERRIDABLE,
	type OverridableComponent,
} from "./vite/virtual-modules.ts";
