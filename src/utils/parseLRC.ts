import type { LyricLine } from "./types";

function parseLRC(lrc: string): LyricLine[] {
    const lines = lrc.split("\n");
    const parsedLines: LyricLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    for (const line of lines) {
        const match = timeRegex.exec(line);
        if (match) {
            const min = parseInt(match[1], 10);
            const sec = parseInt(match[2], 10);
            const ms = parseInt(match[3], 10) * (match[3].length === 2 ? 10 : 1);
            const text = line.replace(timeRegex, "").trim();
            const startTimeMs = (min * 60 + sec) * 1000 + ms;

            parsedLines.push({
                startTimeMs,
                endTimeMs: 0,
                text
            });
        }
    }

    for (let i = 0; i < parsedLines.length - 1; i++) {
        parsedLines[i].endTimeMs = parsedLines[i + 1].startTimeMs;
    }
    if (parsedLines.length > 0) {
        parsedLines[parsedLines.length - 1].endTimeMs = parsedLines[parsedLines.length - 1].startTimeMs + 10000;
    }

    return parsedLines;
}

export { parseLRC };