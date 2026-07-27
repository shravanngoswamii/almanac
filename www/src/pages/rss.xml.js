import { getCollection } from "astro:content";
import rss from "@astrojs/rss";
import { siteConfig } from "../config";
import { withBase } from "../lib/paths";

export async function GET(context) {
	const posts = (await getCollection("blog")).sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);

	return rss({
		title: siteConfig.name,
		description: siteConfig.description,
		site: context.site ?? context.url,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate,
			link: withBase(`/blog/${post.id}/`),
		})),
	});
}
