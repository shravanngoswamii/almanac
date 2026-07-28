import path from "node:path";
import { ExecCache } from "./cache.ts";
import { execute, runnerFor, UnsupportedLanguageError } from "./index.ts";

/** Minimal mdast shapes, declared locally to avoid a dependency on mdast types. */
interface CodeNode {
	type: "code";
	lang?: string | null;
	meta?: string | null;
	value: string;
}
interface HtmlNode {
	type: "html";
	value: string;
}
interface ParentNode {
	type: string;
	children?: unknown[];
}

export interface BlockDirective {
	exec: boolean;
	/** Hide the source and show only the result. */
	hideCode: boolean;
	/** Hide the result and only run for its side effects. */
	hideOutput: boolean;
	timeoutMs?: number;
}

/**
 * Parses the fence meta, so ```js exec timeout=5000 hide-code becomes flags.
 * Unknown words are ignored rather than rejected, which keeps meta usable by
 * other plugins at the same time.
 */
export function parseDirective(
	meta: string | null | undefined,
): BlockDirective {
	const tokens = (meta ?? "").trim().split(/\s+/).filter(Boolean);
	const directive: BlockDirective = {
		exec: false,
		hideCode: false,
		hideOutput: false,
	};
	for (const token of tokens) {
		if (token === "exec") directive.exec = true;
		else if (token === "hide-code") directive.hideCode = true;
		else if (token === "hide-output") directive.hideOutput = true;
		else if (token.startsWith("timeout=")) {
			const value = Number.parseInt(token.slice("timeout=".length), 10);
			if (Number.isFinite(value) && value > 0) directive.timeoutMs = value;
		}
	}
	return directive;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

interface RenderInput {
	stdout: string;
	stderr: string;
	error?: string;
	durationMs: number;
	cached: boolean;
}

/** Renders one result as a block the stylesheet can target. */
export function renderOutput(result: RenderInput): string {
	const parts: string[] = [];
	if (result.stdout) {
		parts.push(
			`<pre class="exec-stream exec-stdout"><code>${escapeHtml(result.stdout)}</code></pre>`,
		);
	}
	if (result.stderr) {
		parts.push(
			`<pre class="exec-stream exec-stderr"><code>${escapeHtml(result.stderr)}</code></pre>`,
		);
	}
	if (result.error) {
		parts.push(`<p class="exec-error">${escapeHtml(result.error)}</p>`);
	}
	if (parts.length === 0) {
		parts.push('<p class="exec-empty">No output.</p>');
	}
	const meta = result.cached ? "cached" : `${result.durationMs}ms`;
	return [
		`<figure class="exec-result" data-exec-state="${result.error ? "error" : "ok"}">`,
		`<figcaption class="exec-caption"><span>Output</span><span class="exec-meta">${meta}</span></figcaption>`,
		...parts,
		"</figure>",
	].join("");
}

export interface RemarkExecOptions {
	/** Project root, used to place the cache directory. */
	root: string;
	/** Directory for cached results, relative to root unless absolute. */
	cacheDir?: string;
	/** Default timeout for a block that does not set one. */
	timeoutMs?: number;
	/** Called for each executed block so the build can report totals. */
	onResult?: (info: {
		language: string;
		cached: boolean;
		error?: string;
	}) => void;
}

type Tree = ParentNode;

/**
 * Executes fenced blocks marked with `exec` and inserts their output. Blocks
 * are run sequentially: they are allowed to share a working directory, and a
 * predictable order matters more than speed when results are cached anyway.
 */
export function remarkExec(options: RemarkExecOptions) {
	const cacheDir = options.cacheDir
		? path.resolve(options.root, options.cacheDir)
		: path.join(options.root, ".almanac", "exec");
	const cache = new ExecCache(cacheDir);

	return async function transformer(tree: Tree): Promise<void> {
		const targets: { parent: ParentNode; index: number; node: CodeNode }[] = [];

		const walk = (node: ParentNode) => {
			const children = node.children;
			if (!Array.isArray(children)) return;
			children.forEach((child, index) => {
				const candidate = child as ParentNode;
				if (candidate.type === "code") {
					const code = child as CodeNode;
					if (parseDirective(code.meta).exec) {
						targets.push({ parent: node, index, node: code });
					}
					return;
				}
				walk(candidate);
			});
		};
		walk(tree);

		// Insert from the end so earlier indices stay valid.
		for (const target of targets.reverse()) {
			const directive = parseDirective(target.node.meta);
			const language = target.node.lang ?? "";
			// Asking the registry rather than one runner: a block in a language
			// nobody can run stays an ordinary highlighted block.
			if (!runnerFor(language)) continue;

			let rendered: string;
			try {
				const result = await execute(
					{
						code: target.node.value,
						language,
						run: {
							timeoutMs: directive.timeoutMs ?? options.timeoutMs,
							// Runtimes like Pyodide are optional peers of the project, so
							// the runner needs its root to resolve them.
							root: options.root,
						},
					},
					cache,
				);
				options.onResult?.({
					language: result.language,
					cached: result.cached,
					error: result.error,
				});
				rendered = directive.hideOutput ? "" : renderOutput(result);
			} catch (error) {
				if (error instanceof UnsupportedLanguageError) continue;
				throw error;
			}

			const replacement: unknown[] = [];
			if (!directive.hideCode) replacement.push(target.node);
			if (rendered) {
				const html: HtmlNode = { type: "html", value: rendered };
				replacement.push(html);
			}
			target.parent.children?.splice(target.index, 1, ...replacement);
		}
	};
}
