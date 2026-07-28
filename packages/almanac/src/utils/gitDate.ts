import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * Memoized because a docs site asks for the same handful of files repeatedly
 * across a build and each miss costs a process spawn.
 */
const cache = new Map<string, Date | undefined>();

/**
 * The commit date of a file's last change, or undefined when git cannot answer.
 *
 * Returning undefined rather than falling back to the filesystem mtime is
 * deliberate: a fresh clone rewrites every mtime to checkout time, so an mtime
 * fallback would confidently stamp every page with the day CI ran. No date is
 * better than a wrong one. Shallow clones hit the same problem inside git
 * itself, which is why CI needs full history for this to mean anything.
 */
export function gitLastModified(file: string): Date | undefined {
	const cached = cache.get(file);
	if (cached !== undefined || cache.has(file)) return cached;

	let result: Date | undefined;
	try {
		const stdout = execFileSync(
			"git",
			["log", "-1", "--format=%cI", "--", path.basename(file)],
			{
				cwd: path.dirname(file),
				encoding: "utf8",
				stdio: ["ignore", "pipe", "ignore"],
			},
		).trim();
		if (stdout) {
			const date = new Date(stdout);
			if (!Number.isNaN(date.getTime())) result = date;
		}
	} catch {
		// Not a repository, git missing, or the file is untracked.
		result = undefined;
	}

	cache.set(file, result);
	return result;
}
