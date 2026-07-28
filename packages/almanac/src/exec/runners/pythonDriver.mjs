// Runs one Python block under Pyodide and prints a JSON envelope.
//
// A separate process, rather than loading Pyodide in the build: a WASM VM
// cannot be interrupted from the thread it runs on, so a block with an infinite
// loop would hang the whole build. Out here the parent can SIGKILL it.
//
// argv: <projectRoot> <codeFile>
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Kept in sync with ENVELOPE in python.ts.
const MARKER = "__ALMANAC_RESULT__";

const [root, codeFile] = process.argv.slice(2);

const finish = (payload) => {
	process.stdout.write(MARKER + JSON.stringify(payload));
	process.exit(0);
};

try {
	const code = await readFile(codeFile, "utf8");

	// Resolved against the consuming project: pyodide is an optional peer, so it
	// lives in the project's tree rather than this package's.
	const require = createRequire(path.join(root, "package.json"));
	const specifier = pathToFileURL(require.resolve("pyodide")).href;
	const mod = await import(specifier);
	const loadPyodide = mod.loadPyodide ?? mod.default?.loadPyodide;
	if (typeof loadPyodide !== "function") {
		throw new Error("pyodide did not export loadPyodide");
	}

	const stdout = [];
	const stderr = [];
	const pyodide = await loadPyodide({
		stdout: (line) => stdout.push(line),
		stderr: (line) => stderr.push(line),
	});

	let error;
	try {
		await pyodide.runPythonAsync(code);
	} catch (thrown) {
		// Pyodide's message is the full Python traceback, which is what a reader
		// of the page wants to see, so it is kept whole.
		error = String(thrown?.message ?? thrown).trimEnd();
	}

	finish({ stdout: stdout.join("\n"), stderr: stderr.join("\n"), error });
} catch (thrown) {
	finish({
		stdout: "",
		stderr: "",
		error: `python runner failed: ${thrown?.message ?? String(thrown)}`,
	});
}
