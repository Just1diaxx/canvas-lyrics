import type { LyricsData } from "../utils/types";
import { parseLRC } from "../utils/parseLRC";

let lrclibRetryAfter = 0;

async function fetchLRCLibLyrics(trackName: string, artistName: string, durationMs: number): Promise<LyricsData | null> {
    const now = Date.now();
    if (now < lrclibRetryAfter) {
        return null;
    }

    try {
        const query = new URLSearchParams({
            track_name: trackName,
            artist_name: artistName,
            duration: (durationMs / 1000).toString()
        });

        const res = await fetch(`https://lrclib.net/api/get?${query.toString()}`);

        if (res.status === 429) {
            const retryAfterStr = res.headers.get("Retry-After");
            const retryAfterSecs = retryAfterStr ? parseInt(retryAfterStr, 10) : 60;
            lrclibRetryAfter = Date.now() + retryAfterSecs * 1000;
            return null;
        }

        if (!res.ok) {
            throw new Error(`LRCLIB returned ${res.status}`);
        }

        const data = await res.json();
        if (data && data.syncedLyrics) {
            const lines = parseLRC(data.syncedLyrics);
            return {
                provider: "lrclib",
                lines
            };
        }
    } catch (err) {
        console.error("CanvasLyrics: Failed to fetch LRCLIB lyrics", err);
    }
    return null;
}

export { fetchLRCLibLyrics };