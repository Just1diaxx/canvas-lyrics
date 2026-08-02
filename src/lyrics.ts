import { fetchNativeLyrics } from "./sources/spotifyapi";
import { fetchLRCLibLyrics } from "./sources/lrclib";
import type { LyricsData } from "./utils/types";

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