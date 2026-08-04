import { fetchNativeLyrics } from "./sources/spotifyapi";
import { fetchLRCLibLyrics } from "./sources/lrclib";
import { fetchNontitledLyrics } from "./sources/nontitled";
import type { LyricsData } from "./utils/types";

export async function getLyrics(track: Spicetify.PlayerTrack): Promise<LyricsData | null> {
  if (!track || !track.uri) {
    return null;
  }

  const trackId = track.uri.split(":").pop();


  if (trackId) {
    // const nontitledLyrics = await fetchNontitledLyrics(trackId);
    // if (nontitledLyrics) {
    //   return nontitledLyrics;
    // }


    const nativeLyrics = await fetchNativeLyrics(trackId);
    if (nativeLyrics) {
      return nativeLyrics;
    }
  }

  const meta = track.metadata;
  if (meta && meta.title && meta.artist_name && meta.duration) {
    const lrclibLyrics = await fetchLRCLibLyrics(
      meta.title,
      meta.artist_name,
      Number(meta.duration)
    );
    if (lrclibLyrics) {
      return lrclibLyrics;
    }
  }

  return null;
}