import { almanac } from "./integration.js";

export default almanac;
export { almanac };

export {
	AlmanacConfigSchema,
	type AlmanacConfig,
	type AlmanacUserConfig,
	type SidebarItem,
	validateConfig,
} from "./config/schema.js";

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
} from "./themes/registry.js";

export {
	OVERRIDABLE,
	type OverridableComponent,
} from "./vite/virtual-modules.js";
