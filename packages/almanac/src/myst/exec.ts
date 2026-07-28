import type { ExecCache } from "../exec/cache.ts";
import { UnsupportedLanguageError, execute } from "../exec/index.ts";
import { parseDirective, renderOutput } from "../exec/remark.ts";
import type { MystNode } from "./deps.ts";

export interface MystExecOptions {
	cache: ExecCache;
	/** The original Markdown, needed to recover fence info strings. */
	source: string;
	timeoutMs?: number;
	onResult?: (info: {
		language: string;
		cached: boolean;
		error?: string;
	}) => void;
}

/**
 * The fence's info string, recovered from the source line the node starts on.
 *
 * myst-parser keeps a `code` node's language but discards the rest of the info
 * string, so ` ```js exec timeout=500 ` arrives with the directives gone.
 * Positions are exact, so reading the original line back is both simpler and
 * safer than rewriting the source before parsing it.
 */
export function fenceInfo(source: string, line: number): string | undefined {
	const raw = source.split("\n")[line - 1];
	if (raw === undefined) return undefined;
	const match = raw.match(/^\s*(?:`{3,}|~{3,})\s*(.*)$/);
	return match?.[1]?.trim();
}

interface Target {
	parent: MystNode;
	index: number;
	node: MystNode;
	language: string;
	directive: ReturnType<typeof parseDirective>;
}

/**
 * Executable blocks, whether written as MyST's `{code-cell}` directive or as a
 * fence carrying `exec`. Supporting both means the same content works in MyST
 * mode and in plain Markdown mode without being rewritten.
 */
export function findExecutable(tree: MystNode, source: string): Target[] {
	const targets: Target[] = [];

	const visit = (parent: MystNode) => {
		const children = parent.children;
		if (!Array.isArray(children)) return;
		children.forEach((child, index) => {
			if (child.type === "code" && typeof child.value === "string") {
				const language = typeof child.lang === "string" ? child.lang : "";
				if (!language) return;

				if (child.executable === true) {
					targets.push({
						parent,
						index,
						node: child,
						language,
						directive: parseDirective("exec"),
					});
					return;
				}

				const position = child.position as
					| { start?: { line?: number } }
					| undefined;
				const line = position?.start?.line;
				if (typeof line !== "number") return;

				const info = fenceInfo(source, line);
				if (!info) return;
				const directive = parseDirective(info.slice(language.length));
				if (!directive.exec) return;

				targets.push({ parent, index, node: child, language, directive });
				return;
			}
			visit(child);
		});
	};
	visit(tree);

	return targets;
}

/**
 * Runs every executable block and splices its output into the tree, with the
 * same `hide-code` and `hide-output` behaviour as the Markdown pipeline so both
 * modes produce markup the same stylesheet covers.
 */
export async function executeMystBlocks(
	tree: MystNode,
	options: MystExecOptions,
): Promise<number> {
	const targets = findExecutable(tree, options.source);
	let ran = 0;

	// Splice from the end so earlier indices stay valid.
	for (const target of targets.reverse()) {
		let rendered: string;
		try {
			const result = await execute(
				{
					code: target.node.value as string,
					language: target.language,
					run: { timeoutMs: target.directive.timeoutMs ?? options.timeoutMs },
				},
				options.cache,
			);
			options.onResult?.({
				language: result.language,
				cached: result.cached,
				error: result.error,
			});
			rendered = target.directive.hideOutput ? "" : renderOutput(result);
		} catch (error) {
			if (error instanceof UnsupportedLanguageError) continue;
			throw error;
		}

		const replacement: MystNode[] = [];
		if (!target.directive.hideCode) replacement.push(target.node);
		if (rendered) replacement.push({ type: "html", value: rendered });
		target.parent.children?.splice(target.index, 1, ...replacement);
		ran += 1;
	}

	return ran;
}
