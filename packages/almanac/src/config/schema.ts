import { z } from "astro/zod";

/**
 * Sidebar entries are mutually recursive: a category holds items, and any item
 * can be another category. Zod expresses that with z.lazy() and an explicit
 * type annotation, which is the main reason this schema is Zod and not Joi.
 */
export type SidebarItem =
	| string
	| { doc: string; label?: string; badge?: string }
	| { link: string; label: string; external?: boolean; badge?: string }
	| {
			label: string;
			items: SidebarItem[];
			collapsed?: boolean;
			badge?: string;
	  }
	| { autogenerate: { directory: string; collapsed?: boolean } };

const SidebarItemSchema: z.ZodType<SidebarItem> = z.lazy(() =>
	z.union([
		z.string(),
		z.object({
			doc: z.string(),
			label: z.string().optional(),
			badge: z.string().optional(),
		}),
		z.object({
			link: z.string(),
			label: z.string(),
			external: z.boolean().optional(),
			badge: z.string().optional(),
		}),
		z.object({
			label: z.string(),
			items: z.array(SidebarItemSchema),
			collapsed: z.boolean().optional(),
			badge: z.string().optional(),
		}),
		z.object({
			autogenerate: z.object({
				directory: z.string(),
				collapsed: z.boolean().optional(),
			}),
		}),
	]),
);

const SeveritySchema = z
	.enum(["ignore", "log", "warn", "throw"])
	.default("warn");

const DocsSchema = z
	.object({
		enabled: z.boolean().default(true),
		/** Directory on disk holding docs content, relative to the project root. */
		path: z.string().default("docs"),
		/** URL segment the docs are served under. Empty string serves at the root. */
		base: z.string().default("docs"),
		/** Omit to generate the sidebar from the directory tree. */
		sidebar: z.array(SidebarItemSchema).optional(),
		pager: z.boolean().default(true),
		toc: z
			.object({
				minDepth: z.number().int().min(1).max(6).default(2),
				maxDepth: z.number().int().min(1).max(6).default(3),
			})
			.prefault({}),
		lastUpdated: z.boolean().default(false),
	})
	.prefault({});

const BlogSchema = z
	.object({
		/** Opt-in: a docs site without a blog is the common case. */
		enabled: z.boolean().default(false),
		path: z.string().default("blog"),
		base: z.string().default("blog"),
		postsPerPage: z.number().int().positive().default(8),
		rss: z.boolean().default(true),
		readingTime: z.boolean().default(true),
		tags: z.boolean().default(true),
	})
	.prefault({});

const ThemeSchema = z
	.object({
		/** Theme id used before the visitor picks one, e.g. "almanac-light". */
		default: z.string().default("almanac-light"),
		/** "all" ships every built-in theme; an array narrows the picker. */
		include: z.union([z.literal("all"), z.array(z.string())]).default("all"),
		/** Extra stylesheets, layered after the framework's own. */
		customCss: z.array(z.string()).default([]),
	})
	.prefault({});

const HeadTagSchema = z.object({
	tag: z.enum(["title", "base", "link", "style", "meta", "script", "noscript"]),
	attrs: z.record(z.string(), z.union([z.string(), z.boolean()])).prefault({}),
	content: z.string().default(""),
});

/**
 * Breaking changes and unfinished subsystems ship behind these flags first, so
 * a minor release can never move the ground under an existing site.
 */
const FutureSchema = z
	.object({
		/** M3: parse through the MyST AST instead of straight to HTML. */
		myst: z.boolean().default(false),
		/** M2: run fenced code blocks and embed their output. */
		execute: z.boolean().default(false),
		/**
		 * M4: also typeset every docs page as a PDF. Needs `myst`, because the
		 * PDF is generated from the same document tree the page is.
		 */
		pdf: z.boolean().default(false),
	})
	.prefault({})
	.refine((value) => !value.pdf || value.myst, {
		message:
			"future.pdf needs future.myst: the PDF is built from the MyST tree",
		path: ["pdf"],
	});

export const AlmanacConfigSchema = z.object({
	title: z.string(),
	tagline: z.string().optional(),
	description: z.string().optional(),
	author: z
		.object({ name: z.string(), url: z.string().url().optional() })
		.optional(),
	logo: z
		.object({
			light: z.string().optional(),
			dark: z.string().optional(),
			alt: z.string().optional(),
		})
		.optional(),
	favicon: z.string().default("/favicon.svg"),
	social: z
		.object({
			github: z.string().url().optional(),
			sponsor: z.string().url().optional(),
			x: z.string().url().optional(),
			bluesky: z.string().url().optional(),
			mastodon: z.string().url().optional(),
			discord: z.string().url().optional(),
			email: z.string().optional(),
		})
		.prefault({}),
	/** Template for "edit this page" links, e.g. "https://github.com/o/r/edit/main/{path}". */
	editUrl: z.string().optional(),

	docs: DocsSchema,
	blog: BlogSchema,
	theme: ThemeSchema,
	search: z
		.object({ provider: z.enum(["pagefind", "none"]).default("pagefind") })
		.prefault({}),

	head: z.array(HeadTagSchema).default([]),

	/** Map a component name to a file that replaces the built-in one. */
	components: z.record(z.string(), z.string()).prefault({}),

	onBrokenLinks: SeveritySchema,
	onBrokenAnchors: SeveritySchema,

	future: FutureSchema,
});

export type AlmanacUserConfig = z.input<typeof AlmanacConfigSchema>;
export type AlmanacConfig = z.output<typeof AlmanacConfigSchema>;

export interface ValidationFailure {
	ok: false;
	issues: string[];
}
export interface ValidationSuccess {
	ok: true;
	config: AlmanacConfig;
}

/**
 * Parses user config and returns flattened, path-prefixed messages. The
 * integration owns how these are reported so every failure reads the same.
 */
export function validateConfig(
	input: unknown,
): ValidationSuccess | ValidationFailure {
	const result = AlmanacConfigSchema.safeParse(input);
	if (result.success) return { ok: true, config: result.data };
	const issues = result.error.issues.map((issue) => {
		const path = issue.path.join(".");
		return path ? `${path}: ${issue.message}` : issue.message;
	});
	return { ok: false, issues };
}
