import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ExecCache } from "../exec/cache.ts";
import { renderMyst } from "./pipeline.ts";

export interface MystProcessorOptions {
	root: string;
	/** Set when `future.execute` is on. */
	exec?: { cacheDir: string; timeoutMs?: number };
	onExecResult?: (info: {
		language: string;
		cached: boolean;
		error?: string;
	}) => void;
	onWarnings?: (file: string, warnings: string[]) => void;
}

interface RenderOptions {
	fileURL?: string;
	frontmatter?: Record<string, unknown>;
}

/**
 * Astro's processor contract is small: a name, and a `createRenderer` that
 * returns something with `render`. The name matters only in that Astro treats
 * `"unified"` specially when merging deprecated `markdown.remarkPlugins`, so a
 * distinct name here keeps this pipeline out of that path.
 */
export function mystProcessor(options: MystProcessorOptions) {
	return {
		name: "almanac-myst",
		async createRenderer(shared: Record<string, unknown>) {
			// Highlighting is delegated to Astro's own Shiki step so that code
			// blocks look identical in both modes and honour the user's
			// `markdown.shikiConfig`.
			const rehypeShiki = await loadRehypeShiki(options.root);
			const shikiConfig = (shared.shikiConfig ?? {}) as Record<string, unknown>;

			const cache = options.exec
				? new ExecCache(options.exec.cacheDir)
				: undefined;

			return {
				async render(content: string, renderOpts?: RenderOptions) {
					const filePath = renderOpts?.fileURL;

					const result = await renderMyst(content, {
						root: options.root,
						filePath,
						exec:
							cache && options.exec
								? {
										cache,
										timeoutMs: options.exec.timeoutMs,
										onResult: options.onExecResult,
									}
								: undefined,
						rehypePlugins: rehypeShiki ? [[rehypeShiki, shikiConfig]] : [],
					});

					if (result.warnings.length > 0) {
						options.onWarnings?.(filePath ?? "unknown", result.warnings);
					}

					return {
						code: result.html,
						metadata: {
							headings: result.headings,
							localImagePaths: result.localImagePaths,
							remoteImagePaths: result.remoteImagePaths,
							frontmatter: renderOpts?.frontmatter ?? {},
						},
					};
				},
			};
		},
	};
}

async function loadRehypeShiki(root: string): Promise<unknown | undefined> {
	try {
		const require = createRequire(path.join(root, "package.json"));
		const specifier = pathToFileURL(
			require.resolve("@astrojs/markdown-remark"),
		).href;
		const mod = (await import(specifier)) as {
			rehypeShiki?: (config: unknown) => unknown;
		};
		return mod.rehypeShiki;
	} catch {
		// Without it, code blocks render as plain <pre><code>, which is a
		// degradation rather than a failure.
		return undefined;
	}
}
