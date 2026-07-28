export interface PreambleOptions {
	title?: string;
	subtitle?: string;
	author?: string;
	/** Rendered under the title, usually where the page came from. */
	source?: string;
}

function quote(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Typst that has to precede converted content.
 *
 * myst-to-typst emits calls into a small vocabulary that mystmd's own template
 * would supply: `tablex` for tables, and spreadable `tableStyle` and
 * `columnStyle` values. They are defined here in terms of Typst builtins rather
 * than imported from the Typst package registry, because reaching the registry
 * would make every build depend on the network and fail behind a firewall.
 */
export function preamble(options: PreambleOptions = {}): string {
	const lines = [
		'#set page(paper: "a4", margin: (x: 2.2cm, y: 2.4cm))',
		'#set text(size: 10.5pt, font: ("Liberation Serif", "DejaVu Serif", "Times New Roman"))',
		"#set par(justify: false, leading: 0.68em)",
		"#show heading: set block(above: 1.4em, below: 0.8em)",
		'#show raw: set text(font: ("Liberation Mono", "DejaVu Sans Mono"), size: 9pt)',
		'#show link: set text(fill: rgb("#14724b"))',
		"",
		"// Values myst-to-typst expects the surrounding template to define. It",
		"// emits its own macros for admonitions and figures, but reads these.",
		"// Defined in terms of Typst builtins rather than imported from the",
		"// package registry, so a build never depends on the network.",
		"#let breakableDefault = false",
		"#let tableStyle = (stroke: 0.5pt + luma(180), inset: 6pt)",
		"#let columnStyle = (:)",
		"#let tablex(columns: 1, header-rows: 0, repeat-header: false, ..args) = {",
		"  table(columns: columns, ..args.named(), ..args.pos())",
		"}",
		"",
	];

	if (options.title) {
		lines.push(
			`#align(center)[#text(size: 20pt, weight: "bold")[${quote(options.title)}]]`,
		);
		if (options.subtitle) {
			lines.push(
				`#align(center)[#text(size: 11pt, fill: luma(90))[${quote(options.subtitle)}]]`,
			);
		}
		const footer = [options.author, options.source].filter(Boolean).join(" / ");
		if (footer) {
			lines.push(
				`#align(center)[#text(size: 9pt, fill: luma(120))[${quote(footer)}]]`,
			);
		}
		lines.push("#v(1.2em)", "");
	}

	return lines.join("\n");
}
