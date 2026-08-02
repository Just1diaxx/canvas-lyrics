import type { LyricsData, LyricLine } from "../utils/types";

async function fetchNativeLyrics(trackId: string): Promise<LyricsData | null> {
    try {
        const url = `https://spclient.wg.spotify.com/color-lyrics/v2/track/${trackId}?format=json&vocalRemoval=false&market=from_token`;
        const response = await Spicetify.CosmosAsync.get(url);
        if (response && response.lyrics && response.lyrics.lines) {
            const lines: LyricLine[] = response.lyrics.lines.map((line: any) => ({
                startTimeMs: Number(line.startTimeMs),
                endTimeMs: Number(line.startTimeMs) + 5000,
                text: line.words || ""
            }));

            for (let i = 0; i < lines.length - 1; i++) {
                lines[i].endTimeMs = lines[i + 1].startTimeMs;
            }
            if (lines.length > 0) {
                lines[lines.length - 1].endTimeMs = lines[lines.length - 1].startTimeMs + 10000;
            }

            return {
                provider: "native",
                lines: lines
            };
        }
    } catch (err) {
        console.error("CanvasLyrics: Failed to fetch native lyrics", err);
    }
    return null;
}

export { fetchNativeLyrics };