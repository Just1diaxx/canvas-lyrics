import React, { useEffect, useState } from "react";
import type { LyricsData } from "./lyrics";

interface LyricOverlayProps {
  lyricsData: LyricsData | null;
  progress: number;
  mode?: "canvas" | "cover";
  bottomOffset?: number;
}

const carouselKeyframes = `
  @keyframes carouselEnter {
    0% {
      opacity: 0;
      transform: translateY(100%);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes carouselExit {
    0% {
      opacity: 1;
      transform: translateY(0);
    }
    100% {
      opacity: 0;
      transform: translateY(-100%);
    }
  }
`;

export const LyricOverlay: React.FC<LyricOverlayProps> = ({
  lyricsData,
  progress,
  mode = "canvas",
  bottomOffset = 90,
}) => {
  const [activeText, setActiveText] = useState<string>("");
  const [prevText, setPrevText] = useState<string>("");
  const [lineKey, setLineKey] = useState<number>(-1);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  useEffect(() => {
    if (!lyricsData || lyricsData.lines.length === 0) {
      setActiveText("");
      setPrevText("");
      setLineKey(-1);
      return;
    }

    const activeIndex = lyricsData.lines.findIndex(
      (line) => progress >= line.startTimeMs && progress < line.endTimeMs
    );

    if (activeIndex !== -1) {
      const text = lyricsData.lines[activeIndex].text;
      if (text !== activeText) {
        setPrevText(activeText);
        setActiveText(text);
        setLineKey(activeIndex);
        setIsTransitioning(true);

        const timer = setTimeout(() => {
          setIsTransitioning(false);
          setPrevText("");
        }, 350);
        return () => clearTimeout(timer);
      }
    } else {
      setActiveText("");
      setPrevText("");
      setLineKey(-1);
    }
  }, [lyricsData, progress, activeText]);

  if (!activeText && !prevText) return null;

  return (
    <div
      style={{
        position: mode === "canvas" ? "absolute" : "relative",
        bottom: mode === "canvas" ? `${bottomOffset}px` : "auto",
        left: mode === "canvas" ? "20px" : "auto",
        right: mode === "canvas" ? "20px" : "auto",
        margin: mode === "cover" ? "12px 0 8px 0" : "0",
        padding: "0 4px",
        pointerEvents: "none",
        textAlign: "left",
        width: "100%",
        boxSizing: "border-box",
        zIndex: 9999,
        transition: "bottom 0.15s ease-out",
        overflow: "hidden",
      }}
    >
      <style>{carouselKeyframes}</style>

      <div style={{ position: "relative", width: "100%" }}>
        {isTransitioning && prevText && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              color: mode === "canvas" ? "#ffffff" : "var(--text-base, #ffffff)",
              fontSize: mode === "canvas" ? "18px" : "16px",
              fontWeight: "700",
              lineHeight: "1.3",
              textShadow: mode === "canvas" ? "0 2px 8px rgba(0, 0, 0, 0.95), 0 0 16px rgba(0, 0, 0, 0.8)" : "none",
              wordWrap: "break-word",
              letterSpacing: "-0.01em",
              animation: "carouselExit 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
            }}
          >
            {prevText}
          </div>
        )}

        <div
          key={lineKey}
          style={{
            color: mode === "canvas" ? "#ffffff" : "var(--text-base, #ffffff)",
            fontSize: mode === "canvas" ? "18px" : "16px",
            fontWeight: "700",
            lineHeight: "1.3",
            textShadow: mode === "canvas" ? "0 2px 8px rgba(0, 0, 0, 0.95), 0 0 16px rgba(0, 0, 0, 0.8)" : "none",
            wordWrap: "break-word",
            letterSpacing: "-0.01em",
            animation: isTransitioning
              ? "carouselEnter 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) forwards"
              : "none",
          }}
        >
          {activeText}
        </div>
      </div>
    </div>
  );
};
