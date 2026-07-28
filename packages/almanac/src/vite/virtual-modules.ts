import type { Plugin as VitePlugin } from "vite";
import type { AlmanacConfig } from "../config/schema.ts";
import { buildThemesCss, selectThemes } from "../themes/registry.ts";

/**
 * Component names the framework renders through the override map. A site can
 * replace any of them by pointing `components` at its own .astro file.
 */
export const OVERRIDABLE = [
	"BackToTop",
	"BlogCard",
	"Logo",
	"PromptCast",
	"Search",
	"ShareLinks",
	"SocialLinks",
	"TableOfContents",
	"VariantPicker",
] as const;

export type OverridableComponent = (typeof OVERRIDABLE)[number];

const VIRTUAL_IDS = {
	config: "virtual:almanac/config",
	themes: "virtual:almanac/themes",
	components: "virtual:almanac/components",
} as const;

export interface VirtualModuleContext {
	config: AlmanacConfig;
	/** Absolute path to the consuming project's root. */
	root: string;
	/** Absolute path to this package's src directory. */
	packageSrc: string;
}

function serialize(value: unknown): string {
	return JSON.stringify(value, null, 2);
}

function configModule(ctx: VirtualModuleContext): string {
	return `export const config = ${serialize(ctx.config)};\nexport default config;\n`;
}

function themesModule(ctx: VirtualModuleContext): string {
	const themes = selectThemes(ctx.config.theme.include);
	const css = buildThemesCss(themes);
	// The picker only needs presentational fields, so the token maps are
	// dropped here rather than shipped to the client twice.
	const forPicker = themes.map(
		({ id, family, name, mode, swatch, bg, surface, text }) => ({
			id,
			family,
			name,
			mode,
			swatch,
			bg,
			surface,
			text,
		}),
	);
	return [
		`export const themes = ${serialize(forPicker)};`,
		`export const themesCss = ${JSON.stringify(css)};`,
		`export const defaultTheme = ${JSON.stringify(ctx.config.theme.default)};`,
		"export default themes;",
		"",
	].join("\n");
}

/**
 * Re-exports each overridable component from either the site's replacement or
 * the framework's built-in. Consumers import from one place and never branch.
 */
function componentsModule(ctx: VirtualModuleContext): string {
	const overrides = ctx.config.components;
	const lines = OVERRIDABLE.map((name) => {
		const override = overrides[name];
		const target = override
			? JSON.stringify(resolveOverride(override, ctx.root))
			: JSON.stringify(
					`${ctx.packageSrc.replace(/\/$/, "")}/components/${name}.astro`,
				);
		return `export { default as ${name} } from ${target};`;
	});
	return `${lines.join("\n")}\n`;
}

function resolveOverride(specifier: string, root: string): string {
	if (specifier.startsWith(".")) {
		return new URL(specifier, `file://${root}/`).pathname;
	}
	return specifier;
}

export function almanacVitePlugin(ctx: VirtualModuleContext): VitePlugin {
	const builders: Record<string, (c: VirtualModuleContext) => string> = {
		[VIRTUAL_IDS.config]: configModule,
		[VIRTUAL_IDS.themes]: themesModule,
		[VIRTUAL_IDS.components]: componentsModule,
	};

	return {
		name: "almanac:virtual-modules",
		resolveId(id) {
			return id in builders ? `\0${id}` : null;
		},
		load(id) {
			if (!id.startsWith("\0")) return null;
			const build = builders[id.slice(1)];
			return build ? build(ctx) : null;
		},
	};
}
