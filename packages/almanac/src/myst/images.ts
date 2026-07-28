interface HastNode {
	type: string;
	tagName?: string;
	properties?: Record<string, unknown>;
	children?: HastNode[];
}

/** HAST spellings that must survive the rewrite below. */
const PRESERVED = ["className", "htmlFor"] as const;

/**
 * Replaces `<img>` properties with the marker Astro looks for when it swaps in
 * optimized images.
 *
 * Astro's own rehype step reads the collected paths out of the vfile, which is
 * private to its processor, so MyST mode has to stamp the marker itself.
 * Without this, a relative `![](./chart.png)` would ship the raw path and 404.
 */
export function rehypeAstroImages(collected: {
	local: string[];
	remote: string[];
}) {
	return (tree: HastNode) => {
		if (collected.local.length === 0 && collected.remote.length === 0) return;

		const seen = new Map<string, number>();

		const visit = (node: HastNode) => {
			for (const child of node.children ?? []) visit(child);
			if (node.type !== "element" || node.tagName !== "img") return;
			const rawSrc = node.properties?.src;
			if (typeof rawSrc !== "string") return;

			let src: string;
			try {
				src = decodeURI(rawSrc);
			} catch {
				return;
			}

			let properties: Record<string, unknown>;
			if (collected.local.includes(src)) {
				properties = { ...node.properties, src };
			} else if (collected.remote.includes(src)) {
				const hasSize =
					"width" in (node.properties ?? {}) &&
					"height" in (node.properties ?? {});
				properties = {
					inferSize: hasSize ? undefined : true,
					...node.properties,
					src,
				};
			} else {
				return;
			}

			const kept: Record<string, unknown> = {};
			for (const key of PRESERVED) {
				if (key in properties) {
					kept[key] = properties[key];
					delete properties[key];
				}
			}

			const index = seen.get(rawSrc) ?? 0;
			seen.set(rawSrc, index + 1);
			node.properties = {
				...kept,
				__ASTRO_IMAGE_: JSON.stringify({ ...properties, index }),
			};
		};

		visit(tree);
	};
}
