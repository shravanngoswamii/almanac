import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import { config, siteConfig } from "../config";
import { withBase } from "../lib/paths";
import { docHref } from "../utils/sidebar";

export async function GET(context: APIContext) {
	const posts = (await getCollection("blog"))
		.filter((post) => !post.data.draft)
		.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

	return rss({
		title: siteConfig.name,
		description: siteConfig.description,
		site: (context.site ?? context.url).toString(),
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate,
			link: withBase(docHref(config.blog.base, post.id)),
		})),
	});
}
