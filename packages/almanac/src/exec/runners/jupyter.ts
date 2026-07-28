import type { ExecArtifact, ExecOutput } from "../cache.ts";
import type { RunOptions, Runner } from "./registry.ts";

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Where the kernel server lives. Read from the environment rather than the
 * config file because the token is a credential, and a credential in
 * `astro.config.mjs` is a credential in version control.
 */
export function jupyterServer(env: NodeJS.ProcessEnv = process.env): {
	url?: string;
	token?: string;
} {
	return {
		url: env.ALMANAC_JUPYTER_URL,
		token: env.ALMANAC_JUPYTER_TOKEN,
	};
}

export function jupyterAvailable(
	env: NodeJS.ProcessEnv = process.env,
): boolean {
	return Boolean(jupyterServer(env).url);
}

interface KernelMessage {
	header?: { msg_type?: string };
	parent_header?: { msg_id?: string };
	content?: Record<string, unknown>;
}

/** The MIME bundles worth keeping, richest first. */
const BUNDLES: { mime: string; kind: ExecArtifact["kind"] }[] = [
	{ mime: "image/png", kind: "png" },
	{ mime: "image/svg+xml", kind: "svg" },
	{ mime: "text/html", kind: "html" },
	{ mime: "application/json", kind: "json" },
];

function artifactsFrom(data: Record<string, unknown>): ExecArtifact[] {
	const found: ExecArtifact[] = [];
	for (const { mime, kind } of BUNDLES) {
		const value = data[mime];
		if (typeof value === "string") found.push({ kind, data: value });
		else if (value !== undefined && kind === "json") {
			found.push({ kind, data: JSON.stringify(value) });
		}
	}
	return found;
}

function textFrom(data: Record<string, unknown>): string | undefined {
	const plain = data["text/plain"];
	return typeof plain === "string" ? plain : undefined;
}

export interface JupyterOptions extends RunOptions {
	/** Kernel spec name, e.g. "python3" or "ir". */
	kernel: string;
	url?: string;
	token?: string;
}

/**
 * Executes a block on a running Jupyter kernel.
 *
 * Unlike the WASM runtimes this needs no child process: the work happens on the
 * server, and a WebSocket can simply be closed, so a hung kernel cannot wedge
 * the build the way an uninterruptible WASM loop would.
 */
export async function runJupyter(
	code: string,
	options: JupyterOptions,
): Promise<ExecOutput> {
	const server = jupyterServer(options.env as NodeJS.ProcessEnv | undefined);
	const url = (options.url ?? server.url)?.replace(/\/$/, "");
	const token = options.token ?? server.token;
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const started = performance.now();

	if (!url) {
		return {
			stdout: "",
			stderr: "",
			error:
				"no Jupyter server configured. Set ALMANAC_JUPYTER_URL, and ALMANAC_JUPYTER_TOKEN if the server needs one.",
			durationMs: 0,
			transient: true,
		};
	}

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(token ? { Authorization: `token ${token}` } : {}),
	};

	const elapsed = () => Math.round(performance.now() - started);
	const fail = (message: string): ExecOutput => ({
		stdout: "",
		stderr: "",
		error: message,
		durationMs: elapsed(),
		transient: true,
	});

	let sessionId: string | undefined;
	let socket: WebSocket | undefined;

	try {
		const response = await fetch(`${url}/api/sessions`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				path: `almanac-${Math.abs(hash(code))}`,
				type: "notebook",
				kernel: { name: options.kernel },
			}),
		});
		if (!response.ok) {
			return fail(
				`Jupyter server refused a ${options.kernel} session: ${response.status} ${response.statusText}`,
			);
		}

		const session = (await response.json()) as {
			id?: string;
			kernel?: { id?: string };
		};
		sessionId = session.id;
		const kernelId = session.kernel?.id;
		if (!sessionId || !kernelId)
			return fail("Jupyter server returned no kernel");

		const wsUrl = `${url.replace(/^http/, "ws")}/api/kernels/${kernelId}/channels${token ? `?token=${token}` : ""}`;
		socket = new WebSocket(wsUrl);

		await withTimeout(
			new Promise<void>((resolve, reject) => {
				if (!socket) return reject(new Error("no socket"));
				socket.onopen = () => resolve();
				socket.onerror = () =>
					reject(new Error("could not open the kernel channel"));
			}),
			timeoutMs,
			"connecting to the kernel",
		);

		const socketRef = socket;
		const listeners = new Set<(message: KernelMessage) => void>();
		socketRef.onmessage = (event) => {
			const message = JSON.parse(String(event.data)) as KernelMessage;
			for (const listener of listeners) listener(message);
		};

		const send = (msgId: string, type: string, content: unknown) => {
			socketRef.send(
				JSON.stringify({
					header: {
						msg_id: msgId,
						msg_type: type,
						session: sessionId,
						username: "almanac",
						version: "5.3",
						date: new Date(0).toISOString(),
					},
					parent_header: {},
					metadata: {},
					content,
					channel: "shell",
				}),
			);
		};

		// A kernel that is still starting drops what is sent to it, and the REST
		// API keeps reporting "starting" until a client is on the channel, so the
		// only reliable readiness signal is a reply to our own request. It is
		// repeated until one arrives.
		await withTimeout(
			handshake(send, listeners),
			timeoutMs,
			"waiting for the kernel to start",
		);

		const msgId = `almanac-${Date.now().toString(36)}-${Math.abs(hash(code)).toString(36)}`;
		const stdout: string[] = [];
		const stderr: string[] = [];
		const artifacts: ExecArtifact[] = [];
		let error: string | undefined;

		const finished = new Promise<void>((resolve) => {
			listeners.add((message) => {
				if (message.parent_header?.msg_id !== msgId) return;
				const type = message.header?.msg_type;
				const content = message.content ?? {};

				if (type === "stream") {
					const text = typeof content.text === "string" ? content.text : "";
					if (content.name === "stderr") stderr.push(text);
					else stdout.push(text);
				} else if (type === "execute_result" || type === "display_data") {
					const data = (content.data ?? {}) as Record<string, unknown>;
					const text = textFrom(data);
					// The plain text alternative is kept as well as the rich one, so
					// output still reads sensibly where an image cannot be shown.
					if (text) stdout.push(text);
					artifacts.push(...artifactsFrom(data));
				} else if (type === "error") {
					const traceback = Array.isArray(content.traceback)
						? content.traceback.map(stripAnsi).join("\n")
						: `${content.ename}: ${content.evalue}`;
					error = traceback.trimEnd();
				} else if (
					type === "status" &&
					(content as { execution_state?: string }).execution_state === "idle"
				) {
					resolve();
				}
			});
		});

		send(msgId, "execute_request", {
			code,
			silent: false,
			store_history: false,
			stop_on_error: true,
			allow_stdin: false,
		});

		await withTimeout(finished, timeoutMs, `after ${timeoutMs}ms`);

		return {
			stdout: stdout.join("").trimEnd(),
			stderr: stderr.join("").trimEnd(),
			...(error ? { error } : {}),
			...(artifacts.length > 0 ? { artifacts } : {}),
			durationMs: elapsed(),
		};
	} catch (thrown) {
		const message = thrown instanceof Error ? thrown.message : String(thrown);
		return fail(
			message.startsWith("timed out")
				? message
				: `Jupyter run failed: ${message}`,
		);
	} finally {
		socket?.close();
		if (sessionId) {
			// A leaked session leaves a kernel process running on the server.
			await fetch(`${url}/api/sessions/${sessionId}`, {
				method: "DELETE",
				headers,
			}).catch(() => undefined);
		}
	}
}

/**
 * Asks the kernel to identify itself until it answers.
 *
 * The request is cheap and idempotent, and repeating it is what covers the gap
 * between a session existing and its kernel being able to receive work.
 */
function handshake(
	send: (msgId: string, type: string, content: unknown) => void,
	listeners: Set<(message: KernelMessage) => void>,
): Promise<void> {
	return new Promise<void>((resolve) => {
		let attempt = 0;
		let done = false;

		const listener = (message: KernelMessage) => {
			if (message.header?.msg_type !== "kernel_info_reply") return;
			done = true;
			listeners.delete(listener);
			clearInterval(timer);
			resolve();
		};
		listeners.add(listener);

		const ask = () => {
			if (done) return;
			attempt += 1;
			send(`almanac-info-${attempt}`, "kernel_info_request", {});
		};

		const timer = setInterval(ask, 500);
		ask();
	});
}

function withTimeout<T>(
	promise: Promise<T>,
	ms: number,
	what: string,
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(`timed out ${what}`)), ms);
		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error) => {
				clearTimeout(timer);
				reject(error);
			},
		);
	});
}

/** Tracebacks arrive with terminal colour codes, which are noise in HTML. */
export function stripAnsi(value: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: matching real escapes
	return value.replace(/\[[0-9;]*[A-Za-z]/g, "");
}

function hash(value: string): number {
	let result = 0;
	for (let index = 0; index < value.length; index += 1) {
		result = (result * 31 + value.charCodeAt(index)) | 0;
	}
	return result;
}

/**
 * Selected only when a block asks for a kernel by name, so it never shadows the
 * local runtimes: `python exec` stays on Pyodide, and
 * `python exec kernel=python3` goes to the server.
 */
export const jupyterRunner: Runner = {
	id: "jupyter",
	languages: new Set(),
	engineId: (options) => {
		const kernel = (options as JupyterOptions | undefined)?.kernel ?? "unknown";
		const url =
			(options as JupyterOptions | undefined)?.url ??
			jupyterServer().url ??
			"none";
		// The server is part of the engine: the same kernel name on a different
		// machine can have entirely different packages installed.
		return `jupyter-${new URL(url === "none" ? "http://none" : url).host}-${kernel}`;
	},
	run: (code, _language, options) =>
		runJupyter(code, options as JupyterOptions),
};
