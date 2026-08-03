import type { LyricsData } from "../utils/types";
import { parseTTML } from "../utils/parseTTML";

async function fetchNontitledLyrics(trackId: string): Promise<LyricsData | null> {
    try {
        const url = `https://nontitled.eu/spicetify/get/${trackId}`;
        const response = await Spicetify.CosmosAsync.get(url); // json { info, ttml }

        if (response && typeof response.ttml === "string") {
            const lines = parseTTML(response.ttml);
            if (lines.length > 0) {
                return {
                    provider: "nontitled",
                    lines,
                };
            }
        }
    } catch (err) {
        console.error("CanvasLyrics: Failed to fetch nontitled lyrics", err);
    }
    return null;
}

export { fetchNontitledLyrics };