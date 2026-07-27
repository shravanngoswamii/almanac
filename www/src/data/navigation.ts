export interface NavItem {
	title: string;
	href: string;
}

export interface NavGroup {
	title: string;
	items: NavItem[];
}

export const navGroups: NavGroup[] = [
	{
		title: "Get started",
		items: [
			{ title: "Introduction", href: "/docs/" },
			{ title: "Installation", href: "/docs/start/installation/" },
			{ title: "Quick start", href: "/docs/start/quick-start/" },
		],
	},
	{
		title: "Guides",
		items: [
			{ title: "Writing docs", href: "/docs/guides/writing-docs/" },
			{ title: "Search", href: "/docs/guides/search/" },
			{ title: "Theming", href: "/docs/guides/theming/" },
			{ title: "Terminal demos", href: "/docs/guides/terminal-demos/" },
		],
	},
	{
		title: "Reference",
		items: [
			{ title: "Configuration", href: "/docs/reference/configuration/" },
			{ title: "Deployment", href: "/docs/reference/deployment/" },
			{ title: "Changelog", href: "/docs/reference/changelog/" },
		],
	},
];

export const quickLinks = navGroups.flatMap((group) => group.items);
