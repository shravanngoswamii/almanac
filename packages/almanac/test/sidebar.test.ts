import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	autogenerateSidebar,
	buildSidebar,
	docHref,
	flattenNav,
	type SidebarEntry,
} from "../src/utils/sidebar.ts";

function entry(
	id: string,
	title: string,
	extra: Partial<SidebarEntry["data"]> = {},
): SidebarEntry {
	return { id, data: { title, ...extra } };
}

const tree: SidebarEntry[] = [
	entry("index", "Introduction"),
	entry("start/installation", "Installation"),
	entry("start/quick-start", "Quick start"),
	entry("guides/theming", "Theming"),
	entry("guides/search", "Search"),
	entry("reference/configuration", "Configuration"),
];

describe("docHref", () => {
	it("collapses an index entry to the base itself", () => {
		assert.equal(docHref("docs", "index"), "/docs/");
	});

	it("collapses a nested index to its directory", () => {
		assert.equal(docHref("docs", "guides/index"), "/docs/guides/");
	});

	it("always ends in a trailing slash", () => {
		assert.equal(
			docHref("docs", "start/installation"),
			"/docs/start/installation/",
		);
	});

	it("serves at the root when the base is empty", () => {
		assert.equal(docHref("", "index"), "/");
		assert.equal(docHref("", "guides/theming"), "/guides/theming/");
	});

	it("tolerates a base wrapped in slashes", () => {
		assert.equal(docHref("/docs/", "index"), "/docs/");
	});
});

describe("autogenerateSidebar", () => {
	it("groups by top-level directory and leads with root pages", () => {
		const groups = autogenerateSidebar(tree, "docs");
		assert.deepEqual(
			groups.map((g) => g.title),
			["Overview", "Guides", "Reference", "Start"],
		);
		assert.deepEqual(
			groups[0]?.items.map((i) => i.title),
			["Introduction"],
		);
	});

	it("sorts alphabetically inside a group when no order is given", () => {
		const groups = autogenerateSidebar(tree, "docs");
		const guides = groups.find((g) => g.title === "Guides");
		assert.deepEqual(
			guides?.items.map((i) => i.title),
			["Search", "Theming"],
		);
	});

	it("honours an explicit sidebar order ahead of alphabetical", () => {
		const ordered: SidebarEntry[] = [
			entry("guides/b", "Beta", { sidebar: { order: 2 } }),
			entry("guides/a", "Alpha", { sidebar: { order: 1 } }),
		];
		const groups = autogenerateSidebar(ordered, "docs");
		assert.deepEqual(
			groups[0]?.items.map((i) => i.title),
			["Alpha", "Beta"],
		);
	});

	it("puts ordered entries before unordered ones", () => {
		const mixed: SidebarEntry[] = [
			entry("guides/aaa", "Aaa"),
			entry("guides/zzz", "Zzz", { sidebar: { order: 1 } }),
		];
		const groups = autogenerateSidebar(mixed, "docs");
		assert.deepEqual(
			groups[0]?.items.map((i) => i.title),
			["Zzz", "Aaa"],
		);
	});

	it("prefers a sidebar label over the page title", () => {
		const labelled = [
			entry("guides/x", "Long title", { sidebar: { label: "Short" } }),
		];
		const groups = autogenerateSidebar(labelled, "docs");
		assert.equal(groups[0]?.items[0]?.title, "Short");
	});

	it("drops drafts and hidden pages", () => {
		const hidden: SidebarEntry[] = [
			entry("guides/keep", "Keep"),
			entry("guides/draft", "Draft", { draft: true }),
			entry("guides/secret", "Secret", { sidebar: { hidden: true } }),
		];
		const groups = autogenerateSidebar(hidden, "docs");
		assert.deepEqual(
			groups[0]?.items.map((i) => i.title),
			["Keep"],
		);
	});

	it("scopes to a single directory when asked", () => {
		const groups = autogenerateSidebar(tree, "docs", "start");
		assert.equal(groups.length, 1);
		assert.equal(groups[0]?.title, "Start");
		assert.deepEqual(
			groups[0]?.items.map((i) => i.title),
			["Installation", "Quick start"],
		);
	});
});

describe("buildSidebar", () => {
	it("falls back to autogeneration when no sidebar is configured", () => {
		const groups = buildSidebar(tree, { base: "docs" });
		assert.deepEqual(
			groups.map((g) => g.title),
			["Overview", "Guides", "Reference", "Start"],
		);
	});

	it("preserves the configured order rather than the directory order", () => {
		const groups = buildSidebar(tree, {
			base: "docs",
			sidebar: [
				{ label: "Reference", items: ["reference/configuration"] },
				{ label: "Get started", items: ["index", "start/installation"] },
			],
		});
		assert.deepEqual(
			groups.map((g) => g.title),
			["Reference", "Get started"],
		);
		assert.deepEqual(
			groups[1]?.items.map((i) => i.title),
			["Introduction", "Installation"],
		);
	});

	it("lets a doc entry override the label", () => {
		const groups = buildSidebar(tree, {
			base: "docs",
			sidebar: [
				{ label: "G", items: [{ doc: "guides/theming", label: "Colors" }] },
			],
		});
		assert.equal(groups[0]?.items[0]?.title, "Colors");
	});

	it("marks http links external without being told", () => {
		const groups = buildSidebar(tree, {
			base: "docs",
			sidebar: [
				{
					label: "Elsewhere",
					items: [{ link: "https://astro.build", label: "Astro" }],
				},
			],
		});
		assert.equal(groups[0]?.items[0]?.external, true);
	});

	it("drops references to docs that do not exist rather than throwing", () => {
		const groups = buildSidebar(tree, {
			base: "docs",
			sidebar: [{ label: "Mixed", items: ["index", "does/not/exist"] }],
		});
		assert.deepEqual(
			groups[0]?.items.map((i) => i.title),
			["Introduction"],
		);
	});

	it("omits a category whose every item was unresolvable", () => {
		const groups = buildSidebar(tree, {
			base: "docs",
			sidebar: [{ label: "Empty", items: ["nope"] }],
		});
		assert.deepEqual(groups, []);
	});

	it("expands an autogenerate entry in place", () => {
		const groups = buildSidebar(tree, {
			base: "docs",
			sidebar: [
				{ label: "Top", items: ["index"] },
				{ autogenerate: { directory: "guides" } },
			],
		});
		assert.deepEqual(
			groups.map((g) => g.title),
			["Top", "Guides"],
		);
	});

	it("collects loose top-level entries into an untitled group", () => {
		const groups = buildSidebar(tree, {
			base: "docs",
			sidebar: ["index", "guides/theming"],
		});
		assert.equal(groups.length, 1);
		assert.equal(groups[0]?.title, "");
		assert.equal(groups[0]?.items.length, 2);
	});
});

describe("flattenNav", () => {
	it("flattens groups in order for the previous and next pager", () => {
		const groups = buildSidebar(tree, {
			base: "docs",
			sidebar: [
				{ label: "A", items: ["index"] },
				{ label: "B", items: ["start/installation"] },
			],
		});
		assert.deepEqual(
			flattenNav(groups).map((i) => i.href),
			["/docs/", "/docs/start/installation/"],
		);
	});

	it("excludes external links so the pager never leaves the site", () => {
		const groups = buildSidebar(tree, {
			base: "docs",
			sidebar: [
				{
					label: "A",
					items: ["index", { link: "https://astro.build", label: "Astro" }],
				},
			],
		});
		assert.deepEqual(
			flattenNav(groups).map((i) => i.href),
			["/docs/"],
		);
	});
});
