import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * The MyST toolchain is an optional peer, so it is resolved against the
 * consuming project rather than this package. Two reasons, the same ones that
 * apply to the unified processor: pnpm will not let a package reach a
 * dependency it did not declare, and a second copy of these modules would carry
 * its own transform state.
 */
const PACKAGES = [
	"myst-parser",
	"myst-to-html",
	"myst-transforms",
	"vfile",
	"unified",
	"rehype-stringify",
] as const;

type PackageName = (typeof PACKAGES)[number];

export interface MystModules {
	mystParse: (source: string) => MystNode;
	mystToHast: unknown;
	formatHtml: unknown;
	transforms: MystTransforms;
	VFile: new () => MystVFile;
	unified: () => MystPipeline;
	rehypeStringify: unknown;
}

/** Only the parts of the AST this package touches. */
export interface MystNode {
	type: string;
	children?: MystNode[];
	[key: string]: unknown;
}

export interface MystVFile {
	path?: string;
	messages: { reason?: string; message?: string }[];
}

export interface MystTransforms {
	basicTransformations: (
		tree: MystNode,
		file: MystVFile,
		opts: Record<string, unknown>,
	) => void;
	ReferenceState: new (
		filePath: string,
		opts: { vfile: MystVFile },
	) => ReferenceStateLike;
	enumerateTargetsTransform: (
		tree: MystNode,
		opts: { state: ReferenceStateLike },
	) => void;
	resolveLinksAndCitationsTransform: (
		tree: MystNode,
		opts: { state: ReferenceStateLike },
	) => void;
	resolveReferencesTransform: (
		tree: MystNode,
		file: MystVFile,
		opts: { state: ReferenceStateLike },
	) => void;
	htmlIdsTransform: (tree: MystNode) => void;
	keysTransform: (tree: MystNode) => void;
}

export interface ReferenceStateLike {
	targets: Record<string, unknown>;
}

export interface MystPipeline {
	use(plugin: unknown, options?: unknown): MystPipeline;
	run(tree: unknown): Promise<unknown>;
	stringify(tree: unknown): string;
}

let cached: MystModules | undefined;

function missing(name: PackageName): Error {
	return new Error(
		`[almanac] \`future.myst\` needs the MyST toolchain, and \`${name}\` could not be resolved from this project. Install it with:\n  npm install ${PACKAGES.join(" ")}`,
	);
}

/** Loaded once per build; the transforms are stateless, the parser is not cheap. */
export async function loadMyst(root: string): Promise<MystModules> {
	if (cached) return cached;

	const require = createRequire(path.join(root, "package.json"));
	const load = async (name: PackageName) => {
		let resolved: string;
		try {
			resolved = pathToFileURL(require.resolve(name)).href;
		} catch {
			throw missing(name);
		}
		return await import(resolved);
	};

	const [parser, toHtml, transforms, vfile, unified, stringify] =
		await Promise.all(PACKAGES.map(load));

	cached = {
		mystParse: parser.mystParse,
		mystToHast: toHtml.mystToHast,
		formatHtml: toHtml.formatHtml,
		transforms: transforms as MystTransforms,
		VFile: vfile.VFile,
		unified: unified.unified,
		rehypeStringify: stringify.default ?? stringify,
	};
	return cached;
}

/** Test seam: forget the memoized modules. */
export function resetMystCache(): void {
	cached = undefined;
}
