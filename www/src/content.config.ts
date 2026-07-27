import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const docs = defineCollection({
	loader: glob({ base: "./docs", pattern: "**/*.md" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
	}),
});

const blog = defineCollection({
	loader: glob({ base: "./blog", pattern: "**/*.md" }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			tags: z.array(z.string()).optional(),
			heroImage: z.union([image(), z.string()]).optional(),
		}),
});

export const collections = { docs, blog };
