#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const HERE = path.dirname(fileURLToPath(import.meta.url));

interface Options {
	dir: string;
	name: string;
	install: boolean;
	git: boolean;
}

function parseArgs(argv: string[]): { dir?: string; flags: Set<string> } {
	const flags = new Set<string>();
	let dir: string | undefined;
	for (const arg of argv) {
		if (arg.startsWith("--")) flags.add(arg.slice(2));
		else if (!dir) dir = arg;
	}
	return { dir, flags };
}

/** Derives a usable package name from a directory the user typed. */
function toPackageName(dir: string): string {
	const base = path.basename(path.resolve(dir));
	const cleaned = base
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/^[-_.]+|[-_.]+$/g, "");
	return cleaned || "my-docs";
}

async function locateTemplate(): Promise<string> {
	// Published: the starter ships inside this package. Local: it is a sibling
	// workspace directory.
	const candidates = [
		path.join(HERE, "..", "template"),
		path.join(HERE, "..", "..", "..", "starter"),
	];
	for (const candidate of candidates) {
		if (existsSync(path.join(candidate, "astro.config.mjs"))) return candidate;
	}
	throw new Error("could not locate the starter template");
}

async function isEmptyEnough(dir: string): Promise<boolean> {
	if (!existsSync(dir)) return true;
	const entries = await readdir(dir);
	return entries.filter((e) => e !== ".git").length === 0;
}

/**
 * The starter depends on the framework by workspace protocol so it stays
 * buildable in this repo. A scaffolded copy needs a real version range.
 */
async function rewritePackageJson(dir: string, name: string): Promise<void> {
	const file = path.join(dir, "package.json");
	const pkg = JSON.parse(await readFile(file, "utf8")) as {
		name?: string;
		dependencies?: Record<string, string>;
	};
	pkg.name = name;
	if (pkg.dependencies?.almanac?.startsWith("workspace:")) {
		pkg.dependencies.almanac = `^${await frameworkVersion()}`;
	}
	await writeFile(file, `${JSON.stringify(pkg, null, "\t")}\n`);
}

async function frameworkVersion(): Promise<string> {
	try {
		const own = JSON.parse(
			await readFile(path.join(HERE, "..", "package.json"), "utf8"),
		) as { version?: string };
		return own.version ?? "0.0.0";
	} catch {
		return "0.0.0";
	}
}

function run(command: string, args: string[], cwd: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			stdio: "inherit",
			shell: process.platform === "win32",
		});
		child.on("error", reject);
		child.on("close", (code) =>
			code === 0
				? resolve()
				: reject(new Error(`${command} exited with ${code}`)),
		);
	});
}

function detectPackageManager(): string {
	const ua = process.env.npm_config_user_agent ?? "";
	if (ua.startsWith("pnpm")) return "pnpm";
	if (ua.startsWith("yarn")) return "yarn";
	if (ua.startsWith("bun")) return "bun";
	return "npm";
}

async function prompt(question: string, fallback: string): Promise<string> {
	if (!process.stdin.isTTY) return fallback;
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	try {
		const answer = (await rl.question(`${question} (${fallback}) `)).trim();
		return answer || fallback;
	} finally {
		rl.close();
	}
}

async function main(): Promise<void> {
	const { dir: dirArg, flags } = parseArgs(process.argv.slice(2));

	if (flags.has("help")) {
		process.stdout.write(
			[
				"",
				"  create-almanac: scaffold a documentation site",
				"",
				"  Usage:",
				"    npm create almanac@latest [directory]",
				"",
				"  Options:",
				"    --no-install   skip installing dependencies",
				"    --no-git       skip initializing a git repository",
				"    --help         show this message",
				"",
			].join("\n"),
		);
		return;
	}

	const dir =
		dirArg ?? (await prompt("Where should the site live?", "./my-docs"));
	const target = path.resolve(dir);
	const options: Options = {
		dir: target,
		name: toPackageName(target),
		install: !flags.has("no-install"),
		git: !flags.has("no-git"),
	};

	if (!(await isEmptyEnough(target))) {
		throw new Error(`${target} is not empty. Choose a different directory.`);
	}

	const template = await locateTemplate();
	await mkdir(target, { recursive: true });
	await cp(template, target, {
		recursive: true,
		filter: (source) => {
			const base = path.basename(source);
			return base !== "node_modules" && base !== "dist" && base !== ".astro";
		},
	});
	await rewritePackageJson(target, options.name);

	const pm = detectPackageManager();
	if (options.git) {
		try {
			await run("git", ["init", "-q"], target);
		} catch {
			// A missing git binary should not fail scaffolding.
		}
	}
	if (options.install) {
		await run(pm, ["install"], target);
	}

	const relative = path.relative(process.cwd(), target) || ".";
	process.stdout.write(
		[
			"",
			`  Created ${options.name} in ${relative}`,
			"",
			"  Next:",
			`    cd ${relative}`,
			...(options.install ? [] : [`    ${pm} install`]),
			`    ${pm === "npm" ? "npm run dev" : `${pm} dev`}`,
			"",
			"  Write docs in docs/. Configure the site in astro.config.mjs.",
			"",
		].join("\n"),
	);
}

main().catch((error: unknown) => {
	process.stderr.write(
		`\n  create-almanac failed: ${error instanceof Error ? error.message : String(error)}\n\n`,
	);
	process.exitCode = 1;
});
