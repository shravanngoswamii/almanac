import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "astro/loaders";
import type { Variant } from "./variants.ts";

interface StoreEntry {
	id: string;
	[key: string]: unknown;
}

interface Store {
	set(entry: StoreEntry): boolean | void;
	get(id: string): unknown;
	delete(id: string): void;
	keys(): string[];
	addAssetImports?(imports: string[], id: string): void;
	addModuleImport?(id: string): void;
}

interface LoaderContext {
	store: Store;
	config: { root: URL };
	logger: { warn(message: string): void; info(message: string): void };
	[key: string]: unknown;
}

interface Loader {
	name: string;
	load(context: LoaderContext): Promise<void>;
}

/**
 * A store view that namespaces every id under a prefix.
 *
 * `keys()` deliberately returns nothing. Astro's glob loader treats whatever
 * `keys()` reports at the start as candidates for deletion once it finishes, and
 * with several passes writing into one store each pass would delete the previous
 * one's entries. Pruning is done once, at the end, by the outer loader.
 */
function prefixedStore(
	store: Store,
	prefix: string,
	written: Set<string>,
): Store {
	const full = (id: string) => (prefix ? `${prefix}/${id}` : id);

	return {
		set(entry) {
			const id = full(entry.id);
			written.add(id);
			return store.set({ ...entry, id });
		},
		get: (id) => store.get(full(id)),
		delete: (id) => store.delete(full(id)),
		keys: () => [],
		addAssetImports: (imports, id) =>
			store.addAssetImports?.(imports, full(id)),
		addModuleImport: (id) => store.addModuleImport?.(full(id)),
	};
}

export interface OverlayLoaderOptions {
	variants: Variant[];
	pattern: string | string[];
	name: string;
}

/**
 * Loads the docs collection once per variant, layering each variant's sources.
 *
 * Astro's glob loader is reused rather than reimplemented: it already knows how
 * to parse frontmatter, render Markdown through the configured processor, and
 * track asset imports, and a second implementation of that would drift.
 */
export function overlayLoader(options: OverlayLoaderOptions): Loader {
	return {
		name: options.name,
		async load(context) {
			const root = fileURLToPath(context.config.root);
			const written = new Set<string>();

			for (const variant of options.variants) {
				for (const source of variant.sources) {
					// A version or locale directory that does not exist yet is not an
					// error: it means nothing has been branched or translated.
					if (!existsSync(path.join(root, source))) continue;

					const loader = glob({
						base: `./${source}`,
						pattern: options.pattern,
					}) as unknown as Loader;

					await loader.load({
						...context,
						store: prefixedStore(context.store, variant.prefix, written),
					});
				}
			}

			// Prune anything left from an earlier run, which is what makes a
			// deleted or renamed page disappear during a dev session.
			for (const id of context.store.keys()) {
				if (!written.has(id)) context.store.delete(id);
			}
		},
	};
}
