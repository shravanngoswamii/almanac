import type { ExecCache } from "../exec/cache.ts";
import {
	collectHeadings,
	collectImages,
	applyTargetIds,
	dropEmptyOutputs,
	fixCaptionNumbers,
	labelUnresolvedLinks,
	type MystHeading,
} from "./ast.ts";
import { type MystNode, loadMyst } from "./deps.ts";
import { executeMystBlocks } from "./exec.ts";
import { rehypeAstroImages } from "./images.ts";

export interface RenderMystOptions {
	root: string;
	filePath?: string;
	/** Present only when `future.execute` is on. */
	exec?: {
		cache: ExecCache;
		timeoutMs?: number;
		onResult?: (info: {
			language: string;
			cached: boolean;
			error?: string;
		}) => void;
	};
	/** Rehype plugins applied to the hast tree, used for syntax highlighting. */
	rehypePlugins?: unknown[];
}

export interface RenderMystResult {
	html: string;
	headings: MystHeading[];
	localImagePaths: string[];
	remoteImagePaths: string[];
	/** Unresolved references and similar, surfaced so the build can report them. */
	warnings: string[];
}

/**
 * Markdown to HTML through a MyST AST.
 *
 * The transform order matters and is not obvious, so it is worth stating: the
 * basic transformations lift directives and roles into real nodes, targets are
 * enumerated before anything tries to reference them, links are resolved before
 * cross-references so that `[](#label)` becomes a reference rather than a dead
 * link, and ids are assigned last so a heading's id is stable no matter how many
 * transforms rewrote its children.
 */
export async function renderMyst(
	source: string,
	options: RenderMystOptions,
): Promise<RenderMystResult> {
	const myst = await loadMyst(options.root);
	const { transforms: T } = myst;

	const tree = myst.mystParse(source) as MystNode;
	const vfile = new myst.VFile();
	if (options.filePath) vfile.path = options.filePath;

	T.basicTransformations(tree, vfile, {});

	const state = new T.ReferenceState(options.filePath ?? "/", { vfile });
	T.enumerateTargetsTransform(tree, { state });
	T.resolveLinksAndCitationsTransform(tree, { state });
	T.resolveReferencesTransform(tree, vfile, { state });
	T.htmlIdsTransform(tree);
	applyTargetIds(tree);
	fixCaptionNumbers(tree);
	labelUnresolvedLinks(tree);

	if (options.exec) {
		await executeMystBlocks(tree, {
			cache: options.exec.cache,
			source,
			timeoutMs: options.exec.timeoutMs,
			onResult: options.exec.onResult,
		});
	}

	// After execution: a block replaced by its output is no longer a heading
	// target, and the keys transform wants the final shape of the tree.
	dropEmptyOutputs(tree);
	const headings = collectHeadings(tree);
	const images = collectImages(tree);
	T.keysTransform(tree);

	// Without allowDangerousHtml, mdast-util-to-hast silently drops `html`
	// nodes, which is both how raw HTML in Markdown disappears and how executed
	// blocks lose their output.
	let pipe = myst
		.unified()
		.use(myst.mystToHast, { allowDangerousHtml: true })
		.use(myst.formatHtml);
	for (const plugin of options.rehypePlugins ?? []) {
		pipe = Array.isArray(plugin)
			? pipe.use(plugin[0], plugin[1])
			: pipe.use(plugin);
	}
	// Only local images are handed to Astro's asset pipeline. Claiming a remote
	// one requires checking it against `image.domains` and `image.remotePatterns`
	// with Astro's own helper, which strict package managers do not expose to a
	// dependency, and claiming an image Astro then refuses fails the build. Left
	// alone, remote images render as ordinary <img> tags.
	const claimed = { local: images.local, remote: [] as string[] };

	pipe = pipe
		// Factory form: unified calls this with the options to get the
		// transformer. Passing the transformer itself would have unified invoke
		// it as the attacher, with no tree.
		.use(rehypeAstroImages, claimed)
		.use(myst.rehypeStringify, { allowDangerousHtml: true });

	const hast = await pipe.run(tree);
	const html = pipe.stringify(hast);

	return {
		html,
		headings,
		localImagePaths: claimed.local,
		remoteImagePaths: claimed.remote,
		warnings: vfile.messages.map(
			(message) => message.reason ?? message.message ?? "",
		),
	};
}
