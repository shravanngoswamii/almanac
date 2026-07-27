import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildThemesCss,
	DEFAULT_DARK_ID,
	DEFAULT_LIGHT_ID,
	getTheme,
	modeOf,
	oppositeMode,
	selectThemes,
	THEMES,
} from "../src/themes/registry.ts";

describe("theme registry", () => {
	it("gives every family a sibling in the other mode", () => {
		const byFamily = new Map<string, Set<string>>();
		for (const theme of THEMES) {
			const modes = byFamily.get(theme.family) ?? new Set<string>();
			modes.add(theme.mode);
			byFamily.set(theme.family, modes);
		}
		const lopsided = [...byFamily]
			.filter(([, modes]) => modes.size !== 2)
			.map(([family]) => family);
		assert.deepEqual(lopsided, [], "every family must ship light and dark");
	});

	it("has unique ids", () => {
		const ids = THEMES.map((t) => t.id);
		assert.equal(new Set(ids).size, ids.length);
	});

	it("names ids as family-mode", () => {
		for (const theme of THEMES) {
			assert.equal(theme.id, `${theme.family}-${theme.mode}`);
		}
	});

	it("ships both default ids", () => {
		assert.ok(getTheme(DEFAULT_LIGHT_ID));
		assert.ok(getTheme(DEFAULT_DARK_ID));
	});

	it("leaves the default family's tokens to global.css", () => {
		const light = getTheme(DEFAULT_LIGHT_ID);
		const dark = getTheme(DEFAULT_DARK_ID);
		assert.deepEqual(light?.tokens, {});
		assert.deepEqual(dark?.tokens, {});
	});

	it("derives a full token set for every other theme", () => {
		const expected = [
			"--bg",
			"--surface",
			"--surface-muted",
			"--surface-card",
			"--text",
			"--muted",
			"--line",
			"--accent",
			"--accent-strong",
			"--code-bg",
			"--code-text",
			"--logo-accent",
		];
		for (const theme of THEMES.filter((t) => t.family !== "almanac")) {
			for (const token of expected) {
				assert.ok(theme.tokens[token], `${theme.id} is missing ${token}`);
			}
		}
	});

	it("infers mode from an id it does not know", () => {
		assert.equal(modeOf("dracula-dark"), "dark");
		assert.equal(modeOf("made-up-dark"), "dark");
		assert.equal(modeOf("made-up-light"), "light");
	});

	it("toggles to the same family in the other mode", () => {
		assert.equal(oppositeMode("dracula-dark"), "dracula-light");
		assert.equal(oppositeMode("nord-light"), "nord-dark");
	});

	it("falls back to the default when a family has no sibling", () => {
		assert.equal(oppositeMode("unknown-light"), "unknown-light");
	});

	it("keeps the default family even when narrowing the list", () => {
		const selected = selectThemes(["dracula-dark"]);
		const families = new Set(selected.map((t) => t.family));
		assert.ok(families.has("almanac"), "the default must survive narrowing");
		assert.ok(families.has("dracula"));
	});

	it("accepts a family name when narrowing, not just an id", () => {
		const selected = selectThemes(["nord"]);
		const nord = selected.filter((t) => t.family === "nord");
		assert.equal(nord.length, 2, "naming a family selects both its modes");
	});
});

describe("buildThemesCss", () => {
	it("matches both attributes so it outranks the base dark rule", () => {
		const css = buildThemesCss();
		assert.ok(
			css.includes('html[data-mode="dark"][data-theme="dracula-dark"]'),
			"a single-attribute selector would lose the specificity tie",
		);
	});

	it("omits the default family, whose tokens live in global.css", () => {
		const css = buildThemesCss();
		assert.ok(!css.includes('data-theme="almanac-light"'));
		assert.ok(!css.includes('data-theme="almanac-dark"'));
	});

	it("emits only the themes it was given", () => {
		const css = buildThemesCss(selectThemes(["nord"]));
		assert.ok(css.includes('data-theme="nord-dark"'));
		assert.ok(!css.includes('data-theme="dracula-dark"'));
	});
});
