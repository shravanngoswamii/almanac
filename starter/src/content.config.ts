import { defineCollection } from "astro:content";
import { blogLoader, blogSchema, docsLoader, docsSchema } from "almanac/content";

export const collections = {
	docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
	blog: defineCollection({ loader: blogLoader(), schema: blogSchema() }),
};
