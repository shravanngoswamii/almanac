/**
 * Slugifies a tag the same simple way everywhere it's used: lowercase, trim,
 * collapse any run of non a-z/0-9/hyphen characters into a single hyphen,
 * then strip leading/trailing hyphens. Tag URLs are `/blog/tags/<slug>/`.
 */
export function slugifyTag(tag: string): string {
	return tag
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}
