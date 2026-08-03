import React, { useEffect, useState } from "react";
import { getActiveLyricIndex } from "./utils/getActiveLyricIndex";
import type { LyricOverlayProps } from "./utils/types";

const waiting = "__waiting__";

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

    const activeIndex = getActiveLyricIndex(lyricsData.lines, progress);

    if (activeIndex !== -1) {
      const text = lyricsData.lines[activeIndex].text;
      if (activeIndex !== lineKey) {
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
      const nextIdx = lyricsData.lines.findIndex((l) => l.startTimeMs > progress);
      let showIndicator = false;
      let shortPauseText = "";
      let shortPauseLineKey = -1;

      if (nextIdx !== -1) {
        const startOfGap = nextIdx === 0 ? 0 : lyricsData.lines[nextIdx - 1].endTimeMs;
        const endOfGap = lyricsData.lines[nextIdx].startTimeMs;
        const gapDuration = endOfGap - startOfGap;

        if (progress >= startOfGap) {
          if (gapDuration > 3000) {
            showIndicator = true;
          } else if (nextIdx > 0) {
            shortPauseText = lyricsData.lines[nextIdx - 1].text;
            shortPauseLineKey = nextIdx - 1;
          }
        }
      }

      if (showIndicator) {
        if (lineKey !== -2) {
          setPrevText(activeText);
          setActiveText(waiting);
          setLineKey(-2);
          setIsTransitioning(true);

          const timer = setTimeout(() => {
            setIsTransitioning(false);
            setPrevText("");
          }, 350);
          return () => clearTimeout(timer);
        }
      } else if (shortPauseText) {
        if (activeText !== shortPauseText || lineKey !== shortPauseLineKey) {
          setPrevText(activeText);
          setActiveText(shortPauseText);
          setLineKey(shortPauseLineKey);
          setIsTransitioning(true);

          const timer = setTimeout(() => {
            setIsTransitioning(false);
            setPrevText("");
          }, 350);
          return () => clearTimeout(timer);
        }
      } else {
        if (lineKey !== -1) {
          setActiveText("");
          setPrevText("");
          setLineKey(-1);
        }
      }
    }
  }, [lyricsData, progress, activeText, lineKey]);

  let gapProgress = 0;
  if (activeText === waiting && lyricsData) {
    const nextIdx = lyricsData.lines.findIndex((l) => l.startTimeMs > progress);
    if (nextIdx !== -1) {
      const startOfGap = nextIdx === 0 ? 0 : lyricsData.lines[nextIdx - 1].endTimeMs;
      const endOfGap = lyricsData.lines[nextIdx].startTimeMs;
      const gapDuration = endOfGap - startOfGap;
      gapProgress = Math.min(1, Math.max(0, (progress - startOfGap) / gapDuration));
    }
  }

  const maxLyricLines = 3;
  const lyricLineHeight = "1.3";
  const lyricBlockHeight = `calc(${lyricLineHeight}em * ${maxLyricLines})`;

  const renderContent = (text: string, isPrev: boolean) => {
    if (text === waiting) {
      return (
        <div style={{
          display: 'flex',
          gap: '6px',
          alignItems: 'center',
          height: mode === "canvas" ? "24px" : "21px",
          marginTop: "4px"
        }}>
          {[0, 1, 2].map(i => {
            const start = i * 0.333;
            const end = (i + 1) * 0.333;
            let opacity = 1;
            if (!isPrev) {
              if (gapProgress >= end) opacity = 1;
              else if (gapProgress <= start) opacity = 0.3;
              else opacity = 0.3 + 0.7 * ((gapProgress - start) / (end - start));
            }

            return (
              <div key={i} style={{
                width: mode === "canvas" ? '8px' : '6px',
                height: mode === "canvas" ? '8px' : '6px',
                borderRadius: '50%',
                backgroundColor: mode === "canvas" ? '#ffffff' : 'var(--text-base, #ffffff)',
                opacity,
                boxShadow: mode === "canvas" ? "0 2px 4px rgba(0,0,0,0.5)" : "none",
              }} />
            );
          })}
        </div>
      );
    }
    return text;
  };

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
        width: mode === "canvas" ? "calc(100% - 40px)" : "100%",
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
              lineHeight: lyricLineHeight,
              minHeight: lyricBlockHeight,
              maxHeight: lyricBlockHeight,
              wordWrap: "break-word",
              letterSpacing: "-0.01em",
              overflow: "hidden",
              animation: "carouselExit 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
            }}
          >
            {renderContent(prevText, true)}
          </div>
        )}

        <div
          key={lineKey}
          style={{
            color: mode === "canvas" ? "#ffffff" : "var(--text-base, #ffffff)",
            fontSize: mode === "canvas" ? "18px" : "16px",
            fontWeight: "700",
            lineHeight: lyricLineHeight,
            minHeight: lyricBlockHeight,
            maxHeight: lyricBlockHeight,
            wordWrap: "break-word",
            letterSpacing: "-0.01em",
            overflow: "hidden",
            animation: isTransitioning
              ? "carouselEnter 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) forwards"
              : "none",
          }}
        >
          {renderContent(activeText, false)}
        </div>
      </div>
    </div>
  );
};
