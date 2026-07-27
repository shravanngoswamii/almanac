import type { SidebarItem } from "../config/schema.ts";

export interface NavItem {
	title: string;
	href: string;
	badge?: string;
	external?: boolean;
}

export interface NavGroup {
	title: string;
	items: NavItem[];
	collapsed?: boolean;
}

/** The subset of a docs collection entry the sidebar needs. */
export interface SidebarEntry {
	id: string;
	data: {
		title: string;
		slug?: string;
		sidebar?: {
			label?: string;
			order?: number;
			badge?: string | { text: string };
			hidden?: boolean;
		};
		draft?: boolean;
	};
}

function badgeText(
	badge: string | { text: string } | undefined,
): string | undefined {
	if (!badge) return undefined;
	return typeof badge === "string" ? badge : badge.text;
}

/** Docs URLs always end in a slash, and "index" collapses to the base itself. */
export function docHref(base: string, id: string): string {
	const trimmedBase = base.replace(/^\/+|\/+$/g, "");
	const prefix = trimmedBase ? `/${trimmedBase}` : "";
	const withoutIndex = id.replace(/(^|\/)index$/, "");
	return withoutIndex ? `${prefix}/${withoutIndex}/` : `${prefix}/`;
}

function label(entry: SidebarEntry): string {
	return entry.data.sidebar?.label ?? entry.data.title;
}

function toNavItem(base: string, entry: SidebarEntry): NavItem {
	return {
		title: label(entry),
		href: docHref(base, entry.data.slug ?? entry.id),
		badge: badgeText(entry.data.sidebar?.badge),
	};
}

/** Explicit order wins; everything else falls back to alphabetical by label. */
function compareEntries(a: SidebarEntry, b: SidebarEntry): number {
	const ao = a.data.sidebar?.order;
	const bo = b.data.sidebar?.order;
	if (ao !== undefined && bo !== undefined) return ao - bo;
	if (ao !== undefined) return -1;
	if (bo !== undefined) return 1;
	return label(a).localeCompare(label(b));
}

function titleCase(segment: string): string {
	const words = segment.replace(/[-_]+/g, " ").trim();
	return words.charAt(0).toUpperCase() + words.slice(1);
}

function visible(entries: SidebarEntry[]): SidebarEntry[] {
	return entries.filter(
		(entry) => !entry.data.draft && !entry.data.sidebar?.hidden,
	);
}

function directoryOf(id: string): string {
	const parts = id.split("/");
	return parts.length > 1 ? (parts[0] ?? "") : "";
}

/**
 * Groups entries by their top-level directory, which is the layout most docs
 * trees already use. Root-level pages lead, so an index page stays first.
 */
export function autogenerateSidebar(
	entries: SidebarEntry[],
	base: string,
	directory?: string,
): NavGroup[] {
	const scoped = directory
		? visible(entries).filter((e) => directoryOf(e.id) === directory)
		: visible(entries);

	const rootPages: SidebarEntry[] = [];
	const byDirectory = new Map<string, SidebarEntry[]>();

	for (const entry of scoped) {
		const dir = directory ? "" : directoryOf(entry.id);
		if (!dir) {
			rootPages.push(entry);
			continue;
		}
		const bucket = byDirectory.get(dir);
		if (bucket) bucket.push(entry);
		else byDirectory.set(dir, [entry]);
	}

	const groups: NavGroup[] = [];
	if (rootPages.length > 0) {
		groups.push({
			title: directory ? titleCase(directory) : "Overview",
			items: rootPages.sort(compareEntries).map((e) => toNavItem(base, e)),
		});
	}
	for (const [dir, dirEntries] of [...byDirectory].sort(([a], [b]) =>
		a.localeCompare(b),
	)) {
		groups.push({
			title: titleCase(dir),
			items: dirEntries.sort(compareEntries).map((e) => toNavItem(base, e)),
		});
	}
	return groups;
}

/**
 * Resolves the configured sidebar against the collection. Bare strings and
 * {doc} entries are looked up by id, {autogenerate} expands a directory, and
 * anything unresolvable is dropped rather than crashing the build.
 */
export function buildSidebar(
	entries: SidebarEntry[],
	options: { base: string; sidebar?: SidebarItem[] },
): NavGroup[] {
	const { base, sidebar } = options;
	if (!sidebar || sidebar.length === 0) {
		return autogenerateSidebar(entries, base);
	}

	const byId = new Map(entries.map((e) => [e.id, e]));
	const groups: NavGroup[] = [];
	let loose: NavItem[] = [];

	const flushLoose = () => {
		if (loose.length > 0) {
			groups.push({ title: "", items: loose });
			loose = [];
		}
	};

	const resolveItem = (item: SidebarItem): NavItem | undefined => {
		if (typeof item === "string") {
			const entry = byId.get(item);
			return entry ? toNavItem(base, entry) : undefined;
		}
		if ("doc" in item) {
			const entry = byId.get(item.doc);
			if (!entry) return undefined;
			const nav = toNavItem(base, entry);
			return {
				...nav,
				title: item.label ?? nav.title,
				badge: item.badge ?? nav.badge,
			};
		}
		if ("link" in item) {
			return {
				title: item.label,
				href: item.link,
				external: item.external ?? /^https?:/.test(item.link),
				badge: item.badge,
			};
		}
		return undefined;
	};

	for (const item of sidebar) {
		if (typeof item === "object" && "autogenerate" in item) {
			flushLoose();
			groups.push(
				...autogenerateSidebar(entries, base, item.autogenerate.directory).map(
					(group) => ({
						...group,
						collapsed: item.autogenerate.collapsed,
					}),
				),
			);
			continue;
		}
		if (typeof item === "object" && "items" in item) {
			flushLoose();
			const items = item.items
				.map(resolveItem)
				.filter((nav): nav is NavItem => nav !== undefined);
			if (items.length > 0) {
				groups.push({
					title: item.label,
					items,
					collapsed: item.collapsed,
				});
			}
			continue;
		}
		const nav = resolveItem(item);
		if (nav) loose.push(nav);
	}
	flushLoose();
	return groups;
}

export function flattenNav(groups: NavGroup[]): NavItem[] {
	return groups
		.flatMap((group) => group.items)
		.filter((item) => !item.external);
}
