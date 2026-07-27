// Copies the workspace starter into this package so the published tarball is
// self-contained. Run automatically on prepack.
import { cp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const starter = path.join(here, "..", "..", "..", "starter");
const template = path.join(here, "..", "template");

await rm(template, { recursive: true, force: true });
await cp(starter, template, {
	recursive: true,
	filter: (source) => {
		const base = path.basename(source);
		return base !== "node_modules" && base !== "dist" && base !== ".astro";
	},
});
process.stdout.write(
	`synced starter into ${path.relative(process.cwd(), template)}\n`,
);
