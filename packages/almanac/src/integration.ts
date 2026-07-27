import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { AstroIntegration } from "astro";
import type { AlmanacConfig, AlmanacUserConfig } from "./config/schema.ts";
import { validateConfig } from "./config/schema.ts";
import { remarkExec } from "./exec/remark.ts";
import { almanacVitePlugin } from "./vite/virtual-modules.ts";

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

/**
 * Astro 7 defaults to the Satteri Markdown processor, which does not run remark
 * plugins. Executing code needs the unified pipeline, so it is loaded on demand
 * and only when the feature is switched on.
 */
async function unifiedProcessorWith(plugin: unknown, root: string) {
	// Resolved against the consuming project rather than this package, for two
	// reasons: pnpm will not let a package reach a dependency it did not
	// declare, and Astro checks the processor with isUnifiedProcessor, which
	// only recognises instances from the copy Astro itself loaded.
	const require = createRequire(path.join(root, "package.json"));
	let specifier: string;
	try {
		specifier = pathToFileURL(require.resolve("@astrojs/markdown-remark")).href;
	} catch {
		throw new Error(
			"[almanac] `future.execute` needs the unified Markdown processor, because Astro's default Satteri processor does not run remark plugins. Install it in your project:\n  npm install @astrojs/markdown-remark",
		);
	}
	const { unified } = (await import(specifier)) as {
		unified: (opts: { remarkPlugins: unknown[] }) => unknown;
	};
	return unified({ remarkPlugins: [plugin] });
}

export function almanac(userConfig: AlmanacUserConfig): AstroIntegration {
	const result = validateConfig(userConfig);
	if (!result.ok) reportInvalidConfig(result.issues);
	const config: AlmanacConfig = result.config;

	// Tallied across the whole build so the summary reports real numbers.
	const execStats = { ran: 0, cached: 0, failed: 0 };

	return {
		name: PACKAGE_NAME,
		hooks: {
			"astro:config:setup": async ({
				config: astroConfig,
				updateConfig,
				injectRoute,
				logger,
			}) => {
				const root = fileURLToPath(astroConfig.root);
				const processor = config.future.execute
					? await unifiedProcessorWith(
							// Tuple form: unified calls the factory with these options to
							// get the transformer. Passing the transformer itself would
							// have unified invoke it with no tree.
							[
								remarkExec,
								{
									root,
									onResult: (info: { cached: boolean; error?: string }) => {
										if (info.error) execStats.failed += 1;
										else if (info.cached) execStats.cached += 1;
										else execStats.ran += 1;
									},
								},
							],
							root,
						)
					: undefined;

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
						...(processor ? { processor } : {}),
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
						pattern: routePattern(config.blog.base, "[...slug]"),
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

				injectRoute({
					pattern: "/404",
					entrypoint: entrypoint("./routes/NotFound.astro"),
					prerender: true,
				});
				injectRoute({
					pattern: "/og.png",
					entrypoint: entrypoint("./routes/og.png.ts"),
					prerender: true,
				});
				injectRoute({
					pattern: "/robots.txt",
					entrypoint: entrypoint("./routes/robots.txt.ts"),
					prerender: true,
				});

				logger.info(
					`docs ${config.docs.enabled ? "on" : "off"}, blog ${config.blog.enabled ? "on" : "off"}, search ${config.search.provider}`,
				);
			},

			"astro:build:done": async ({ dir, logger }) => {
				if (config.future.execute) {
					const { ran, cached, failed } = execStats;
					logger.info(
						`executed ${ran} block${ran === 1 ? "" : "s"}, reused ${cached} from cache${failed ? `, ${failed} failed` : ""}`,
					);
				}
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
