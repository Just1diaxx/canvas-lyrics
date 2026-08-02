export interface LyricLine {
    startTimeMs: number;
    endTimeMs: number;
    text: string;
}

export interface LyricsData {
    provider: "native" | "lrclib" | "nontitled";
    lines: LyricLine[];
}

export interface LyricOverlayProps {
    lyricsData: LyricsData | null;
    progress: number;
    mode?: "canvas" | "cover";
    bottomOffset?: number;
}

export type DisplayMode = "canvas" | "cover";