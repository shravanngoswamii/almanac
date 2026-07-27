import type { APIRoute } from "astro";
import { siteConfig } from "../config";
import { generateOgImage } from "../utils/ogImage";

export const GET: APIRoute = async () => {
	const png = await generateOgImage(siteConfig.name, siteConfig.description);
	const body = new Uint8Array(png);
	return new Response(body, {
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
};
