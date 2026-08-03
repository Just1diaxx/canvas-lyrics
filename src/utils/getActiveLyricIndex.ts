import type { LyricLine } from "./types";

export function getActiveLyricIndex(lines: LyricLine[], progress: number): number {
    if (!lines.length) return -1;

    const activeLines = lines.filter((line) => progress >= line.startTimeMs && progress < line.endTimeMs);

    if (activeLines.length === 0) return -1;

    return lines.findIndex((line) => line.startTimeMs === activeLines[activeLines.length - 1].startTimeMs);
}
