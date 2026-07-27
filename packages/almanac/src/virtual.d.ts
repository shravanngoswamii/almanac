declare module "virtual:almanac/config" {
	import type { AlmanacConfig } from "./config/schema.ts";
	export const config: AlmanacConfig;
	export default config;
}

declare module "virtual:almanac/themes" {
	import type { Mode } from "./themes/registry.ts";
	export interface PickerTheme {
		id: string;
		family: string;
		name: string;
		mode: Mode;
		swatch: string;
		bg: string;
		surface: string;
		text: string;
	}
	export const themes: PickerTheme[];
	export const themesCss: string;
	export const defaultTheme: string;
	export default themes;
}

declare module "virtual:almanac/components" {
	// Astro components are opaque here: the .astro types are not visible to tsc,
	// and every consumer only ever renders them.
	type AstroComponent = (props: Record<string, unknown>) => unknown;
	export const BackToTop: AstroComponent;
	export const BlogCard: AstroComponent;
	export const Logo: AstroComponent;
	export const PromptCast: AstroComponent;
	export const Search: AstroComponent;
	export const ShareLinks: AstroComponent;
	export const TableOfContents: AstroComponent;
}
