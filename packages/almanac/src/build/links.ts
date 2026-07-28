import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export type Severity = "ignore" | "log" | "warn" | "throw";

export interface BrokenLink {
	/** Page the link was written on, as a site path. */
	from: string;
	/** The href exactly as it appeared in the HTML. */
	href: string;
	kind: "link" | "anchor";
}

const HREF = /<a\b[^>]*?\bhref=["']([^"']+)["']/gi;
const ID = /\bid=["']([^"']+)["']/gi;
const NAME = /<a\b[^>]*?\bname=["']([^"']+)["']/gi;

/** Every .html file under a directory, as absolute paths. */
async function htmlFiles(dir: string): Promise<string[]> {
	const found: string[] = [];
	const walk = async (current: string) => {
		const entries = await readdir(current, { withFileTypes: true });
		for (const entry of entries) {
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) await walk(full);
			else if (entry.name.endsWith(".html")) found.push(full);
		}
	};
	await walk(dir);
	return found;
}

/**
 * A page's site path, with and without the trailing slash, plus the directory
 * form. Astro emits `about/index.html`, which is reachable as `/about`,
 * `/about/`, and `/about/index.html`, and all three appear in real content.
 */
function pathsFor(outDir: string, file: string): string[] {
	const rel = path.relative(outDir, file).split(path.sep).join("/");
	const forms = [`/${rel}`];
	if (rel.endsWith("/index.html")) {
		const dir = rel.slice(0, -"index.html".length);
		forms.push(`/${dir}`, `/${dir}`.replace(/\/$/, ""));
	} else if (rel === "index.html") {
		forms.push("/", "");
	} else {
		forms.push(`/${rel.slice(0, -".html".length)}`);
	}
	return forms;
}

function anchorsIn(html: string): Set<string> {
	const ids = new Set<string>();
	for (const match of html.matchAll(ID)) if (match[1]) ids.add(match[1]);
	for (const match of html.matchAll(NAME)) if (match[1]) ids.add(match[1]);
	return ids;
}

/**
 * Checks internal links in the built output. Deliberately operates on emitted
 * HTML rather than on the content sources: a link can be broken by a slug
 * override, a base path, or a redirect that only exists after the build, and
 * those are exactly the breakages that reach production.
 */
export async function checkLinks(
	outDir: string,
	options: { base: string; checkLinks: boolean; checkAnchors: boolean },
): Promise<BrokenLink[]> {
	if (!options.checkLinks && !options.checkAnchors) return [];

	const files = await htmlFiles(outDir);
	const contents = new Map<string, string>();
	const pages = new Map<string, string>();
	for (const file of files) {
		const html = await readFile(file, "utf8");
		contents.set(file, html);
		for (const form of pathsFor(outDir, file)) pages.set(form, file);
	}

	const base = options.base.replace(/\/$/, "");
	const stripBase = (target: string) =>
		base && target.startsWith(base) ? target.slice(base.length) || "/" : target;

	const anchorCache = new Map<string, Set<string>>();
	const anchorsOf = (file: string) => {
		let cached = anchorCache.get(file);
		if (!cached) {
			cached = anchorsIn(contents.get(file) ?? "");
			anchorCache.set(file, cached);
		}
		return cached;
	};

	const broken: BrokenLink[] = [];

	for (const file of files) {
		const fromForms = pathsFor(outDir, file);
		const from = fromForms[1] ?? fromForms[0] ?? "/";
		const html = contents.get(file) ?? "";

		for (const match of html.matchAll(HREF)) {
			const href = match[1];
			if (!href) continue;
			// Anything with a scheme, a protocol-relative host, or a non-http
			// scheme like mailto: is somebody else's problem.
			if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) continue;
			if (href.startsWith("?")) continue;

			const hashAt = href.indexOf("#");
			const rawTarget = hashAt === -1 ? href : href.slice(0, hashAt);
			const hash = hashAt === -1 ? "" : href.slice(hashAt + 1);

			if (!rawTarget) {
				// A bare "#anchor" resolves against the current page.
				if (options.checkAnchors && hash && !anchorsOf(file).has(hash)) {
					broken.push({ from, href, kind: "anchor" });
				}
				continue;
			}

			// Relative hrefs resolve against the page's own directory, the way a
			// browser does. A path ending in a slash already *is* that
			// directory, so taking its dirname would climb one level too far
			// and turn every working "../sibling/" link into a false positive.
			const fromDir = from.endsWith("/") ? from : path.posix.dirname(from);
			const resolved = rawTarget.startsWith("/")
				? stripBase(rawTarget)
				: stripBase(path.posix.resolve(fromDir, rawTarget));

			const candidates = [
				resolved,
				resolved.replace(/\/$/, ""),
				`${resolved.replace(/\/$/, "")}/`,
			];
			const target = candidates.map((c) => pages.get(c)).find(Boolean);

			if (!target) {
				if (options.checkLinks) broken.push({ from, href, kind: "link" });
				continue;
			}

			if (options.checkAnchors && hash && !anchorsOf(target).has(hash)) {
				broken.push({ from, href, kind: "anchor" });
			}
		}
	}

	return broken;
}

export function reportLinks(
	broken: BrokenLink[],
	severities: { links: Severity; anchors: Severity },
	logger: { info(m: string): void; warn(m: string): void },
): void {
	const groups = [
		{ kind: "link" as const, severity: severities.links, noun: "link" },
		{ kind: "anchor" as const, severity: severities.anchors, noun: "anchor" },
	];

	const fatal: string[] = [];

	for (const { kind, severity, noun } of groups) {
		if (severity === "ignore") continue;
		const items = broken.filter((entry) => entry.kind === kind);
		if (items.length === 0) continue;

		const lines = items.map((entry) => `  ${entry.from} -> ${entry.href}`);
		const summary = `${items.length} broken ${noun}${items.length === 1 ? "" : "s"}:\n${lines.join("\n")}`;

		if (severity === "throw") fatal.push(summary);
		else if (severity === "warn") logger.warn(summary);
		else logger.info(summary);
	}

	if (fatal.length > 0) throw new Error(fatal.join("\n\n"));
}
