declare module "virtual:almanac/config" {
	import type { AlmanacConfig } from "./config/schema.js";
	export const config: AlmanacConfig;
	export default config;
}

declare module "virtual:almanac/themes" {
	import type { Mode } from "./themes/registry.js";
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
	type AstroComponent = (...args: never[]) => unknown;
	export const Header: AstroComponent;
	export const Footer: AstroComponent;
	export const Sidebar: AstroComponent;
	export const TableOfContents: AstroComponent;
	export const Pager: AstroComponent;
	export const Search: AstroComponent;
	export const ThemePicker: AstroComponent;
	export const Logo: AstroComponent;
	export const BlogCard: AstroComponent;
	export const PageTitle: AstroComponent;
}
