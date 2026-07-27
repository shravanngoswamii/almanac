const WORDS_PER_MINUTE = 200;

export interface ReadingTime {
	minutes: number;
	words: number;
}

/**
 * Estimates reading time from a raw markdown body string (content collection
 * entries expose this as `.body`). Simple word-count-over-wpm estimate: no
 * markdown parsing, just whitespace splitting.
 */
export function getReadingTime(body: string): ReadingTime {
	const words = body.split(/\s+/).filter((word) => word.length > 0).length;
	const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
	return { minutes, words };
}
