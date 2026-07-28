// Runs one R block under WebR and prints a JSON envelope.
//
// A separate process for the same reason Python gets one: a WASM runtime cannot
// be interrupted from the thread it runs on, so a block that loops forever would
// hang the build instead of timing out.
//
// argv: <projectRoot> <codeFile>
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Kept in sync with ENVELOPE in r.ts.
const MARKER = "__ALMANAC_RESULT__";

const [root, codeFile] = process.argv.slice(2);

const finish = (payload) => {
	process.stdout.write(MARKER + JSON.stringify(payload));
	process.exit(0);
};

try {
	const code = await readFile(codeFile, "utf8");

	const require = createRequire(path.join(root, "package.json"));
	const specifier = pathToFileURL(require.resolve("webr")).href;
	const mod = await import(specifier);
	const WebR = mod.WebR ?? mod.default?.WebR;
	if (typeof WebR !== "function") {
		throw new Error("webr did not export WebR");
	}

	const webR = new WebR();
	await webR.init();

	// A shelter scopes the objects a run creates so they can all be freed at
	// once, which matters because WebR leaks R memory otherwise.
	const shelter = await new webR.Shelter();
	const stdout = [];
	const stderr = [];
	let error;

	try {
		// captureConditions is off on purpose. With it on, WebR intercepts
		// warnings as opaque condition objects and their text is lost, and R's
		// top level autoprint stops matching what a console would show. Off, the
		// streams arrive as the text R actually wrote.
		const result = await shelter.captureR(code, {
			withAutoprint: true,
			capturestreams: true,
			captureConditions: false,
		});
		for (const line of result.output) {
			if (line.type === "stderr") stderr.push(line.data);
			else stdout.push(line.data);
		}

		// The cost of the choice above: an R error is written to stderr rather
		// than raised, so it has to be recognised by its prefix. WebR ships
		// without message translations, so "Error" is not locale dependent.
		const failure = stderr.find((line) => /^Error\b/.test(line));
		if (failure) error = stderr.join("\n").trimEnd();
	} catch (thrown) {
		error = String(thrown?.message ?? thrown).trimEnd();
	} finally {
		await shelter.purge();
		await webR.close();
	}

	finish({ stdout: stdout.join("\n"), stderr: stderr.join("\n"), error });
} catch (thrown) {
	finish({
		stdout: "",
		stderr: "",
		error: `r runner failed: ${thrown?.message ?? String(thrown)}`,
	});
}
