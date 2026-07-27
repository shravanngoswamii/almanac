import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import type { AlmanacConfig, AlmanacUserConfig } from "./config/schema.js";
import { validateConfig } from "./config/schema.js";
import { almanacVitePlugin } from "./vite/virtual-modules.js";

const PACKAGE_NAME = "almanac";

/** Joins a route base with a pattern, tolerating empty or slash-wrapped bases. */
function routePattern(base: string, rest: string): string {
	const trimmed = base.replace(/^\/+|\/+$/g, "");
	return trimmed ? `/${trimmed}/${rest}` : `/${rest}`;
}

function entrypoint(relative: string): string {
	return fileURLToPath(new URL(relative, import.meta.url));
}

function reportInvalidConfig(issues: string[]): never {
	const detail = issues.map((issue) => `  - ${issue}`).join("\n");
	throw new Error(
		`[almanac] Invalid configuration:\n${detail}\n\nSee https://github.com/shravanngoswamii/almanac for the config reference.`,
	);
}

async function runPagefind(outDir: string): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const child = spawn("npx", ["-y", "pagefind", "--site", outDir], {
			stdio: "inherit",
			shell: process.platform === "win32",
		});
		child.on("error", reject);
		child.on("close", (code) =>
			code === 0
				? resolve()
				: reject(new Error(`pagefind exited with code ${code}`)),
		);
	});
}

export function almanac(userConfig: AlmanacUserConfig): AstroIntegration {
	const result = validateConfig(userConfig);
	if (!result.ok) reportInvalidConfig(result.issues);
	const config: AlmanacConfig = result.config;

	return {
		name: PACKAGE_NAME,
		hooks: {
			"astro:config:setup": ({
				config: astroConfig,
				updateConfig,
				injectRoute,
				logger,
			}) => {
				updateConfig({
					vite: {
						plugins: [
							almanacVitePlugin({
								config,
								root: fileURLToPath(astroConfig.root),
								packageSrc: entrypoint("."),
							}),
						],
						// The package ships raw source, so Vite has to process it
						// rather than treat it as a prebuilt external dependency.
						ssr: { noExternal: [PACKAGE_NAME] },
					},
					markdown: {
						shikiConfig: {
							themes: { light: "github-light", dark: "github-dark" },
							defaultColor: false,
							wrap: false,
						},
					},
				});

				if (config.docs.enabled) {
					injectRoute({
						pattern: routePattern(config.docs.base, "[...slug]"),
						entrypoint: entrypoint("./routes/DocsPage.astro"),
						prerender: true,
					});
				}

				if (config.blog.enabled) {
					injectRoute({
						pattern: routePattern(config.blog.base, "[...page]"),
						entrypoint: entrypoint("./routes/BlogIndex.astro"),
						prerender: true,
					});
					injectRoute({
						pattern: routePattern(config.blog.base, "post/[...slug]"),
						entrypoint: entrypoint("./routes/BlogPost.astro"),
						prerender: true,
					});
					if (config.blog.tags) {
						injectRoute({
							pattern: routePattern(config.blog.base, "tags/[tag]"),
							entrypoint: entrypoint("./routes/BlogTag.astro"),
							prerender: true,
						});
					}
					if (config.blog.rss) {
						injectRoute({
							pattern: "/rss.xml",
							entrypoint: entrypoint("./routes/rss.xml.ts"),
							prerender: true,
						});
					}
				}

				logger.info(
					`docs ${config.docs.enabled ? "on" : "off"}, blog ${config.blog.enabled ? "on" : "off"}, search ${config.search.provider}`,
				);
			},

			"astro:build:done": async ({ dir, logger }) => {
				if (config.search.provider !== "pagefind") return;
				const outDir = fileURLToPath(dir);
				logger.info("building the search index");
				try {
					await runPagefind(outDir);
				} catch (error) {
					// A missing search index degrades the site rather than breaking
					// it, so this warns instead of failing the build.
					logger.warn(
						`search index skipped: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			},
		},
	};
}
