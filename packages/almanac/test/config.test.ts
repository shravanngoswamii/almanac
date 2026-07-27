import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateConfig } from "../src/config/schema.ts";

function ok(input: unknown) {
	const result = validateConfig(input);
	assert.equal(
		result.ok,
		true,
		`expected valid config, got: ${JSON.stringify(result)}`,
	);
	if (!result.ok) throw new Error("unreachable");
	return result.config;
}

describe("validateConfig", () => {
	it("requires a title", () => {
		const result = validateConfig({});
		assert.equal(result.ok, false);
		if (result.ok) return;
		assert.ok(result.issues.some((i) => i.startsWith("title:")));
	});

	it("fills every default from a title alone", () => {
		const config = ok({ title: "Docs" });
		assert.equal(config.docs.enabled, true);
		assert.equal(config.docs.path, "docs");
		assert.equal(config.docs.base, "docs");
		assert.equal(config.docs.toc.minDepth, 2);
		assert.equal(config.docs.toc.maxDepth, 3);
		assert.equal(config.blog.enabled, false, "a blog is opt-in");
		assert.equal(config.theme.default, "almanac-light");
		assert.equal(config.theme.include, "all");
		assert.equal(config.search.provider, "pagefind");
		assert.equal(config.onBrokenLinks, "warn");
		assert.equal(config.future.myst, false);
		assert.equal(config.future.execute, false);
	});

	it("reports the path of a nested failure", () => {
		const result = validateConfig({
			title: "D",
			docs: { toc: { maxDepth: 99 } },
		});
		assert.equal(result.ok, false);
		if (result.ok) return;
		assert.ok(result.issues.some((i) => i.includes("docs.toc.maxDepth")));
	});

	it("rejects an unknown severity", () => {
		const result = validateConfig({ title: "D", onBrokenLinks: "explode" });
		assert.equal(result.ok, false);
	});

	it("accepts a recursive sidebar, which is why this schema is Zod", () => {
		const config = ok({
			title: "D",
			docs: {
				sidebar: [
					"index",
					{ doc: "start/install", label: "Install" },
					{ link: "https://astro.build", label: "Astro", external: true },
					{
						label: "Guides",
						items: [
							"guides/a",
							{
								label: "Nested",
								items: ["guides/deep/b", { label: "Deeper", items: ["x"] }],
							},
						],
					},
					{ autogenerate: { directory: "reference", collapsed: true } },
				],
			},
		});
		assert.equal(config.docs.sidebar?.length, 5);
		const guides = config.docs.sidebar?.[3];
		assert.ok(guides && typeof guides === "object" && "items" in guides);
	});

	it("rejects a malformed sidebar entry", () => {
		const result = validateConfig({
			title: "D",
			docs: { sidebar: [{ label: "No items or link" }] },
		});
		assert.equal(result.ok, false);
	});

	it("validates social URLs", () => {
		const result = validateConfig({
			title: "D",
			social: { github: "not-a-url" },
		});
		assert.equal(result.ok, false);
		if (result.ok) return;
		assert.ok(result.issues.some((i) => i.includes("social.github")));
	});

	it("keeps an explicit theme list instead of widening it to all", () => {
		const config = ok({
			title: "D",
			theme: { include: ["dracula-dark", "nord-light"] },
		});
		assert.deepEqual(config.theme.include, ["dracula-dark", "nord-light"]);
	});

	it("accepts a component override map", () => {
		const config = ok({
			title: "D",
			components: { Header: "./src/overrides/Header.astro" },
		});
		assert.equal(config.components.Header, "./src/overrides/Header.astro");
	});

	it("allows an empty docs base so docs can serve from the root", () => {
		const config = ok({ title: "D", docs: { base: "" } });
		assert.equal(config.docs.base, "");
	});
});
