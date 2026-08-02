export interface LyricLine {
  startTimeMs: number;
  endTimeMs: number;
  text: string;
}

export interface LyricsData {
  provider: "native" | "lrclib";
  lines: LyricLine[];
}

let lrclibRetryAfter = 0;

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

async function fetchLRCLibLyrics(trackName: string, artistName: string, albumName: string, durationMs: number): Promise<LyricsData | null> {
  const now = Date.now();
  if (now < lrclibRetryAfter) {
    return null;
  }

  try {
    const query = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
      album_name: albumName,
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

export async function getLyrics(track: Spicetify.PlayerTrack): Promise<LyricsData | null> {
  if (!track || !track.uri) {
    return null;
  }

  const trackId = track.uri.split(":").pop();

  if (trackId) {
    const nativeLyrics = await fetchNativeLyrics(trackId);
    if (nativeLyrics) {
      return nativeLyrics;
    }
  }

  const meta = track.metadata;
  if (meta && meta.title && meta.artist_name && meta.album_title && meta.duration) {
    const fallbackLyrics = await fetchLRCLibLyrics(
      meta.title,
      meta.artist_name,
      meta.album_title,
      Number(meta.duration)
    );
    if (fallbackLyrics) {
      return fallbackLyrics;
    }
  }

  return null;
}
