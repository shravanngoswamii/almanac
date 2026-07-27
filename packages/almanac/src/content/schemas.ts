import { z } from "astro/zod";

/**
 * Minimal local shape of Astro's schema context. Declared here rather than
 * imported from "astro:content" so this package type-checks on its own,
 * without a generated Astro env in scope.
 */
export interface SchemaContext {
	image: () => z.ZodTypeAny;
}

const BadgeSchema = z.union([
	z.string(),
	z.object({
		text: z.string(),
		variant: z.enum(["default", "note", "tip", "caution", "danger"]).optional(),
	}),
]);

const HeadTagSchema = z.object({
	tag: z.enum(["title", "base", "link", "style", "meta", "script", "noscript"]),
	attrs: z.record(z.string(), z.union([z.string(), z.boolean()])).prefault({}),
	content: z.string().default(""),
});

/** Per-page control over the previous/next pager. */
const PagerLinkSchema = z.union([
	z.boolean(),
	z.object({ link: z.string().optional(), label: z.string().optional() }),
]);

const docsBase = z.object({
	title: z.string(),
	description: z.string().optional(),
	/** Overrides the URL derived from the file path. */
	slug: z.string().optional(),
	sidebar: z
		.object({
			label: z.string().optional(),
			/** Lower sorts first; unordered pages fall back to alphabetical. */
			order: z.number().optional(),
			badge: BadgeSchema.optional(),
			hidden: z.boolean().default(false),
		})
		.prefault({}),
	tableOfContents: z
		.union([
			z.boolean(),
			z.object({
				minDepth: z.number().int().min(1).max(6).optional(),
				maxDepth: z.number().int().min(1).max(6).optional(),
			}),
		])
		.optional(),
	/** false opts a single page out of the site-wide editUrl. */
	editUrl: z.union([z.string().url(), z.literal(false)]).optional(),
	lastUpdated: z.union([z.coerce.date(), z.boolean()]).optional(),
	prev: PagerLinkSchema.optional(),
	next: PagerLinkSchema.optional(),
	/** "splash" drops the sidebar and TOC, for landing pages. */
	template: z.enum(["doc", "splash"]).default("doc"),
	draft: z.boolean().default(false),
	head: z.array(HeadTagSchema).default([]),
});

/**
 * Frontmatter schema for the docs collection. Pass `extend` to add your own
 * fields; they merge on top of these.
 */
export function docsSchema<T extends z.ZodObject>(options?: {
	extend?: T;
}): (context: SchemaContext) => z.ZodObject {
	return () => (options?.extend ? docsBase.merge(options.extend) : docsBase);
}

/**
 * Frontmatter schema for the blog collection. `heroImage` accepts either a
 * local file (optimized by Astro) or a remote URL string.
 */
export function blogSchema<T extends z.ZodObject>(options?: {
	extend?: T;
}): (context: SchemaContext) => z.ZodObject {
	return ({ image }) => {
		const base = z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			tags: z.array(z.string()).default([]),
			heroImage: z.union([image(), z.string()]).optional(),
			heroAlt: z.string().optional(),
			authors: z.array(z.string()).default([]),
			draft: z.boolean().default(false),
			head: z.array(HeadTagSchema).default([]),
		});
		return options?.extend ? base.merge(options.extend) : base;
	};
}

export type DocsFrontmatter = z.output<typeof docsBase>;
