// Theme registry. Flect's own look (the green accent defined directly in
// global.css's :root / :root[data-mode="dark"]) is the default theme and emits
// no overrides at all. Every other theme's full token set is *derived* from a
// compact seed (background, surface, text, accent) by buildTokens(), so adding
// a theme is a handful of colors rather than a dozen hand-tuned properties.
//
// Two kinds of theme:
//   - Color families: a shared neutral scale tinted toward a brand accent, in
//     both light and dark.
//   - Signature themes: well-known editor/reading palettes (Sepia, Solarized,
//     Gruvbox, Dracula, Nord, ...) with their own neutrals.

export type Mode = "light" | "dark";

export interface Theme {
	id: string; // "<family>-<mode>"
	family: string;
	name: string;
	mode: Mode;
	/** Accent color for the picker swatch. */
	swatch: string;
	/** Background / surface / text for the picker preview tile. */
	bg: string;
	surface: string;
	text: string;
	/** CSS custom-property overrides; empty for the default (Flect) theme. */
	tokens: Record<string, string>;
}

// ── color math ───────────────────────────────────────────────────────────

interface RGBA {
	r: number;
	g: number;
	b: number;
	a: number;
}

function parse(color: string): RGBA {
	const c = color.trim();
	if (c.startsWith("#")) {
		let hex = c.slice(1);
		if (hex.length === 3) {
			hex = hex
				.split("")
				.map((x) => x + x)
				.join("");
		}
		const n = Number.parseInt(hex, 16);
		return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
	}
	const m = c.match(/rgba?\(([^)]+)\)/);
	if (m) {
		const p = m[1].split(",").map((s) => Number.parseFloat(s.trim()));
		return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
	}
	return { r: 0, g: 0, b: 0, a: 1 };
}

function format(c: RGBA): string {
	const r = Math.round(c.r);
	const g = Math.round(c.g);
	const b = Math.round(c.b);
	if (c.a >= 1) {
		const hex = [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
		return `#${hex}`;
	}
	return `rgba(${r}, ${g}, ${b}, ${Math.round(c.a * 1000) / 1000})`;
}

// Mix `base` toward `other` by `t` (0..1), keeping `base`'s alpha.
function mix(base: RGBA, other: RGBA, t: number): RGBA {
	return {
		r: base.r + (other.r - base.r) * t,
		g: base.g + (other.g - base.g) * t,
		b: base.b + (other.b - base.b) * t,
		a: base.a,
	};
}

function tint(value: string, accent: RGBA, t: number): string {
	return format(mix(parse(value), accent, t));
}

function withAlpha(c: RGBA, a: number): string {
	return format({ ...c, a });
}

// ── palette derivation ───────────────────────────────────────────────────

interface Seed {
	mode: Mode;
	bg: string;
	surface: string;
	text: string;
	accent: string;
}

function buildTokens(seed: Seed): Record<string, string> {
	const dark = seed.mode === "dark";
	const bg = parse(seed.bg);
	const surface = parse(seed.surface);
	const text = parse(seed.text);
	const accent = parse(seed.accent);
	const white = parse("#ffffff");
	const black = parse("#000000");

	const line = mix(surface, text, dark ? 0.18 : 0.12);
	const surfaceMuted = mix(surface, text, dark ? 0.1 : 0.06);
	const accentStrong = mix(accent, dark ? white : black, 0.55);

	return {
		"--bg": format(bg),
		"--surface": format(surface),
		"--surface-muted": format(surfaceMuted),
		"--surface-card": withAlpha(surface, dark ? 0.78 : 0.72),
		"--text": format(text),
		"--muted": format(mix(text, bg, 0.4)),
		"--line": format(line),
		"--accent": format(accent),
		"--accent-strong": format(accentStrong),
		"--code-bg": format(surfaceMuted),
		"--code-text": format(text),
		"--logo-accent": format(accent),
	};
}

// ── color families (shared neutrals + a brand accent) ───────────────────

const NEUTRAL_SEED: Record<
	Mode,
	{ bg: string; surface: string; text: string }
> = {
	light: { bg: "#f8fafc", surface: "#ffffff", text: "#0f172a" },
	dark: { bg: "#0f172a", surface: "#1e293b", text: "#f1f5f9" },
};

interface Family {
	id: string;
	name: string;
	light: string;
	dark: string;
}

const FAMILIES: Family[] = [
	{ id: "slate", name: "Slate", light: "#0f172a", dark: "#e2e8f0" },
	{ id: "graphite", name: "Graphite", light: "#3f3f46", dark: "#d4d4d8" },
	{ id: "blue", name: "Blue", light: "#2563eb", dark: "#60a5fa" },
	{ id: "indigo", name: "Indigo", light: "#4f46e5", dark: "#818cf8" },
	{ id: "violet", name: "Violet", light: "#7c3aed", dark: "#a78bfa" },
	{ id: "sky", name: "Sky", light: "#0284c7", dark: "#38bdf8" },
	{ id: "teal", name: "Teal", light: "#0d9488", dark: "#2dd4bf" },
	{ id: "emerald", name: "Emerald", light: "#059669", dark: "#34d399" },
	{ id: "amber", name: "Amber", light: "#b45309", dark: "#fbbf24" },
	{ id: "rose", name: "Rose", light: "#e11d48", dark: "#fb7185" },
	{ id: "crimson", name: "Crimson", light: "#dc2626", dark: "#f87171" },
	{ id: "fuchsia", name: "Fuchsia", light: "#c026d3", dark: "#e879f9" },
];

const MODES: Mode[] = ["light", "dark"];

function familyTheme(f: Family, mode: Mode): Theme {
	const accent = mode === "dark" ? f.dark : f.light;
	const s = NEUTRAL_SEED[mode];
	const bg = tint(s.bg, parse(accent), 0.05);
	const surface = tint(s.surface, parse(accent), 0.04);
	return {
		id: `${f.id}-${mode}`,
		family: f.id,
		name: f.name,
		mode,
		swatch: accent,
		bg,
		surface,
		text: s.text,
		tokens: buildTokens({ mode, bg, surface, text: s.text, accent }),
	};
}

// ── signature themes (well-known editor / reading palettes) ─────────────

interface Signature {
	id: string;
	family: string;
	name: string;
	mode: Mode;
	bg: string;
	surface: string;
	text: string;
	accent: string;
}

const SIGNATURES: Signature[] = [
	{
		id: "sepia-light",
		family: "sepia",
		name: "Sepia",
		mode: "light",
		bg: "#f7eed7",
		surface: "#fcf6e6",
		text: "#4a3f30",
		accent: "#9c6a35",
	},
	{
		id: "sepia-dark",
		family: "sepia",
		name: "Sepia Dark",
		mode: "dark",
		bg: "#251e15",
		surface: "#33291c",
		text: "#ead9bd",
		accent: "#cf9a5e",
	},
	{
		id: "solarized-light",
		family: "solarized",
		name: "Solarized Light",
		mode: "light",
		bg: "#fdf6e3",
		surface: "#eee8d5",
		text: "#586e75",
		accent: "#268bd2",
	},
	{
		id: "solarized-dark",
		family: "solarized",
		name: "Solarized Dark",
		mode: "dark",
		bg: "#002b36",
		surface: "#073642",
		text: "#93a1a1",
		accent: "#268bd2",
	},
	{
		id: "gruvbox-light",
		family: "gruvbox",
		name: "Gruvbox Light",
		mode: "light",
		bg: "#fbf1c7",
		surface: "#f4e8be",
		text: "#3c3836",
		accent: "#b57614",
	},
	{
		id: "gruvbox-dark",
		family: "gruvbox",
		name: "Gruvbox Dark",
		mode: "dark",
		bg: "#282828",
		surface: "#3c3836",
		text: "#ebdbb2",
		accent: "#fabd2f",
	},
	{
		id: "dracula-light",
		family: "dracula",
		name: "Dracula Light",
		mode: "light",
		bg: "#fffbeb",
		surface: "#f7f1dc",
		text: "#1f1f1f",
		accent: "#644ac9",
	},
	{
		id: "dracula-dark",
		family: "dracula",
		name: "Dracula",
		mode: "dark",
		bg: "#282a36",
		surface: "#343746",
		text: "#f8f8f2",
		accent: "#bd93f9",
	},
	{
		id: "nord-light",
		family: "nord",
		name: "Nord Light",
		mode: "light",
		bg: "#eceff4",
		surface: "#e5e9f0",
		text: "#2e3440",
		accent: "#5e81ac",
	},
	{
		id: "nord-dark",
		family: "nord",
		name: "Nord",
		mode: "dark",
		bg: "#2e3440",
		surface: "#3b4252",
		text: "#eceff4",
		accent: "#88c0d0",
	},
	{
		id: "onedark-light",
		family: "onedark",
		name: "One Light",
		mode: "light",
		bg: "#fafafa",
		surface: "#eaeaeb",
		text: "#383a42",
		accent: "#4078f2",
	},
	{
		id: "onedark-dark",
		family: "onedark",
		name: "One Dark",
		mode: "dark",
		bg: "#282c34",
		surface: "#31363f",
		text: "#abb2bf",
		accent: "#61afef",
	},
	{
		id: "tokyonight-light",
		family: "tokyonight",
		name: "Tokyo Night Light",
		mode: "light",
		bg: "#e1e2e7",
		surface: "#d5d6db",
		text: "#33395b",
		accent: "#2e7de9",
	},
	{
		id: "tokyonight-dark",
		family: "tokyonight",
		name: "Tokyo Night",
		mode: "dark",
		bg: "#1a1b26",
		surface: "#24283b",
		text: "#c0caf5",
		accent: "#7aa2f7",
	},
	{
		id: "catppuccin-light",
		family: "catppuccin",
		name: "Catppuccin Latte",
		mode: "light",
		bg: "#eff1f5",
		surface: "#e6e9ef",
		text: "#4c4f69",
		accent: "#8839ef",
	},
	{
		id: "catppuccin-dark",
		family: "catppuccin",
		name: "Catppuccin",
		mode: "dark",
		bg: "#1e1e2e",
		surface: "#313244",
		text: "#cdd6f4",
		accent: "#cba6f7",
	},
];

function signatureTheme(s: Signature): Theme {
	return {
		id: s.id,
		family: s.family,
		name: s.name,
		mode: s.mode,
		swatch: s.accent,
		bg: s.bg,
		surface: s.surface,
		text: s.text,
		tokens: buildTokens(s),
	};
}

// ── the default theme: Flect's own look, defined in global.css ──────────

function flectTheme(mode: Mode): Theme {
	const light = {
		bg: "#fbfaf7",
		surface: "#ffffff",
		text: "#151816",
		accent: "#14724b",
	};
	const dark = {
		bg: "#101413",
		surface: "#171d1a",
		text: "#f4f1ea",
		accent: "#6ee7b7",
	};
	const seed = mode === "dark" ? dark : light;
	return {
		id: `flect-${mode}`,
		family: "flect",
		name: "Flect",
		mode,
		swatch: seed.accent,
		bg: seed.bg,
		surface: seed.surface,
		text: seed.text,
		tokens: {}, // no overrides: this is exactly global.css's own :root rules
	};
}

export const THEMES: Theme[] = [
	...MODES.map(flectTheme),
	...FAMILIES.flatMap((f) => MODES.map((mode) => familyTheme(f, mode))),
	...SIGNATURES.map(signatureTheme),
];

export const DEFAULT_LIGHT_ID = "flect-light";
export const DEFAULT_DARK_ID = "flect-dark";

const BY_ID = new Map(THEMES.map((t) => [t.id, t]));

export function getTheme(id: string): Theme | undefined {
	return BY_ID.get(id);
}

export function modeOf(id: string): Mode {
	return getTheme(id)?.mode ?? (id.endsWith("-dark") ? "dark" : "light");
}

// The same family in the opposite mode, for the quick light/dark toggle; falls
// back to the default Flect theme when that family has no sibling mode.
export function oppositeMode(id: string): string {
	const theme = getTheme(id);
	if (!theme) return id;
	const other: Mode = theme.mode === "dark" ? "light" : "dark";
	const sibling = `${theme.family}-${other}`;
	if (getTheme(sibling)) return sibling;
	return other === "dark" ? DEFAULT_DARK_ID : DEFAULT_LIGHT_ID;
}

// Generated CSS for every non-default theme, meant to be embedded once at
// build time (see BaseLayout.astro). Selecting a theme just sets data-mode
// and data-theme on <html> and these rules take over.
//
// The selector matches on BOTH attributes (not just data-theme) so its
// specificity (html + two attributes) unambiguously beats the base
// `:root[data-mode="dark"]` rule in global.css (:root + one attribute).
// Matching data-theme alone would tie that base rule's specificity in dark
// mode and lose the tie-break, since the base rule can appear later in the
// cascade depending on how Vite/Astro orders the stylesheets.
export function buildThemesCss(): string {
	return THEMES.filter((t) => Object.keys(t.tokens).length > 0)
		.map((t) => {
			const body = Object.entries(t.tokens)
				.map(([k, v]) => `\t${k}: ${v};`)
				.join("\n");
			return `html[data-mode="${t.mode}"][data-theme="${t.id}"] {\n${body}\n}`;
		})
		.join("\n\n");
}
