(async () => {
  const _wait = (p, a = 0) => new Promise((res, rej) => {
    const i = setInterval(() => {
      if (p()) return clearInterval(i), res();
      if (++a > 1e3) return clearInterval(i), rej(new Error("Timeout"));
    }, 50);
  });
  try {
    const S = window.Spicetify;
    if (S.Events?.platformLoaded?.on) await new Promise((r) => S.Events.platformLoaded.on(r));
    if (S.Events?.webpackLoaded?.on) await new Promise((r) => S.Events.webpackLoaded.on(r));
    await _wait(() => S?.React && S?.ReactJSX && S?.ReactDOM && S?.Platform && S?.Player);
    console.info(`%c[${"canvaslyrics"}:${"extension"}] %cv${"1.1.0"} %cinitialized`, "color: #1DB954; font-weight: bold", "color: #888", "color: unset");
    /* --- START --- */(async function() {
      var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// spicetify-global:react
var require_react = __commonJS({
  "spicetify-global:react"(exports, module) {
    module.exports = Spicetify.React;
  }
});

// spicetify-global:react/jsx-runtime
var require_jsx_runtime = __commonJS({
  "spicetify-global:react/jsx-runtime"(exports, module) {
    module.exports = Spicetify.ReactJSX;
  }
});

// src/lyrics.ts
var lrclibRetryAfter = 0;
async function fetchNativeLyrics(trackId) {
  try {
    const url = `https://spclient.wg.spotify.com/color-lyrics/v2/track/${trackId}?format=json&vocalRemoval=false&market=from_token`;
    const response = await Spicetify.CosmosAsync.get(url);
    if (response && response.lyrics && response.lyrics.lines) {
      const lines = response.lyrics.lines.map((line) => ({
        startTimeMs: Number(line.startTimeMs),
        endTimeMs: Number(line.startTimeMs) + 5e3,
        text: line.words || ""
      }));
      for (let i = 0; i < lines.length - 1; i++) {
        lines[i].endTimeMs = lines[i + 1].startTimeMs;
      }
      if (lines.length > 0) {
        lines[lines.length - 1].endTimeMs = lines[lines.length - 1].startTimeMs + 1e4;
      }
      return {
        provider: "native",
        lines
      };
    }
  } catch (err) {
    console.error("CanvasLyrics: Failed to fetch native lyrics", err);
  }
  return null;
}
async function fetchLRCLibLyrics(trackName, artistName, albumName, durationMs) {
  const now = Date.now();
  if (now < lrclibRetryAfter) {
    return null;
  }
  try {
    const query = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
      album_name: albumName,
      duration: (durationMs / 1e3).toString()
    });
    const res = await fetch(`https://lrclib.net/api/get?${query.toString()}`);
    if (res.status === 429) {
      const retryAfterStr = res.headers.get("Retry-After");
      const retryAfterSecs = retryAfterStr ? parseInt(retryAfterStr, 10) : 60;
      lrclibRetryAfter = Date.now() + retryAfterSecs * 1e3;
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
function parseLRC(lrc) {
  const lines = lrc.split("\n");
  const parsedLines = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = parseInt(match[3], 10) * (match[3].length === 2 ? 10 : 1);
      const text = line.replace(timeRegex, "").trim();
      const startTimeMs = (min * 60 + sec) * 1e3 + ms;
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
    parsedLines[parsedLines.length - 1].endTimeMs = parsedLines[parsedLines.length - 1].startTimeMs + 1e4;
  }
  return parsedLines;
}
async function getLyrics(track) {
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

// src/LyricOverlay.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var waiting = "__waiting__";
var carouselKeyframes = `
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
var LyricOverlay = ({
  lyricsData,
  progress,
  mode = "canvas",
  bottomOffset = 90
}) => {
  const [activeText, setActiveText] = (0, import_react.useState)("");
  const [prevText, setPrevText] = (0, import_react.useState)("");
  const [lineKey, setLineKey] = (0, import_react.useState)(-1);
  const [isTransitioning, setIsTransitioning] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
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
      if (nextIdx !== -1) {
        const startOfGap = nextIdx === 0 ? 0 : lyricsData.lines[nextIdx - 1].endTimeMs;
        const endOfGap = lyricsData.lines[nextIdx].startTimeMs;
        const gapDuration = endOfGap - startOfGap;
        if (gapDuration > 3e3 && progress >= startOfGap) {
          showIndicator = true;
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
  const renderContent = (text, isPrev) => {
    if (text === waiting) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
        display: "flex",
        gap: "6px",
        alignItems: "center",
        height: mode === "canvas" ? "24px" : "21px",
        marginTop: "4px"
      }, children: [0, 1, 2].map((i) => {
        const start = i * 0.333;
        const end = (i + 1) * 0.333;
        let opacity = 1;
        if (!isPrev) {
          if (gapProgress >= end) opacity = 1;
          else if (gapProgress <= start) opacity = 0.3;
          else opacity = 0.3 + 0.7 * ((gapProgress - start) / (end - start));
        }
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
          width: mode === "canvas" ? "8px" : "6px",
          height: mode === "canvas" ? "8px" : "6px",
          borderRadius: "50%",
          backgroundColor: mode === "canvas" ? "#ffffff" : "var(--text-base, #ffffff)",
          opacity,
          boxShadow: mode === "canvas" ? "0 2px 4px rgba(0,0,0,0.5)" : "none"
        } }, i);
      }) });
    }
    return text;
  };
  if (!activeText && !prevText) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      style: {
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
        overflow: "hidden"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: carouselKeyframes }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { position: "relative", width: "100%" }, children: [
          isTransitioning && prevText && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "div",
            {
              style: {
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
                animation: "carouselExit 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) forwards"
              },
              children: renderContent(prevText, true)
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "div",
            {
              style: {
                color: mode === "canvas" ? "#ffffff" : "var(--text-base, #ffffff)",
                fontSize: mode === "canvas" ? "18px" : "16px",
                fontWeight: "700",
                lineHeight: "1.3",
                textShadow: mode === "canvas" ? "0 2px 8px rgba(0, 0, 0, 0.95), 0 0 16px rgba(0, 0, 0, 0.8)" : "none",
                wordWrap: "break-word",
                letterSpacing: "-0.01em",
                animation: isTransitioning ? "carouselEnter 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) forwards" : "none"
              },
              children: renderContent(activeText, false)
            },
            lineKey
          )
        ] })
      ]
    }
  );
};

// src/app.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
async function main() {
  while (!Spicetify?.Player || !Spicetify?.Platform || !Spicetify?.ReactDOM) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  console.log("CanvasLyrics: Extension initialized");
  let currentLyricsData = null;
  let currentProgress = 0;
  let activeRoot = null;
  let activeContainer = null;
  let activeMode = null;
  const cleanupContainer = () => {
    if (activeContainer && activeContainer.parentElement) {
      activeContainer.parentElement.removeChild(activeContainer);
    }
    activeRoot = null;
    activeContainer = null;
    activeMode = null;
  };
  const findPanel = () => {
    const selectors = [
      ".Root__right-sidebar",
      "[data-testid='now-playing-view']",
      "[data-testid='NowPlayingView']",
      "[aria-label='Now playing view']",
      ".main-nowPlayingView-content",
      "aside[class*='Panel']",
      "aside"
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el instanceof HTMLElement) {
        return el;
      }
    }
    return null;
  };
  const findTitleElement = (panel) => {
    const titleSelectors = [
      "[data-testid='now-playing-widget']",
      "[data-testid='context-item-info']",
      ".main-nowPlayingView-contextItemInfo",
      ".main-trackInfo-container",
      "[data-testid='track-info']"
    ];
    for (const sel of titleSelectors) {
      const el = panel.querySelector(sel);
      if (el && el instanceof HTMLElement) {
        return el;
      }
    }
    const link = panel.querySelector("a[href*='/track/']") || panel.querySelector("a[href*='/artist/']");
    if (link) {
      const container = link.closest("div");
      if (container && container instanceof HTMLElement && container !== panel) {
        return container;
      }
    }
    return null;
  };
  const getCanvasBottomOffset = (panel, video) => {
    const videoRect = video.getBoundingClientRect();
    if (videoRect.height === 0) return 90;
    let anchor = null;
    const buttons = panel.querySelectorAll("button");
    for (const btn of buttons) {
      const txt = (btn.textContent || "").toLowerCase();
      if (txt.includes("video") || txt.includes("passa") || txt.includes("switch") || txt.includes("view")) {
        anchor = btn;
        break;
      }
    }
    if (!anchor) {
      anchor = findTitleElement(panel);
    }
    if (anchor) {
      const anchorRect = anchor.getBoundingClientRect();
      const offset = Math.round(videoRect.bottom - anchorRect.top + 8);
      if (offset > 10 && offset < videoRect.height) {
        return offset;
      }
    }
    return 90;
  };
  const isVideoMode = () => {
    const item = Spicetify.Player?.data?.item;
    if (item && item.type !== "track") {
      return true;
    }
    const panel = findPanel();
    if (panel) {
      const buttons = panel.querySelectorAll("button");
      for (const btn of buttons) {
        const txt = (btn.textContent || "").toLowerCase();
        if (txt.includes("audio") || txt.includes("switch to audio")) {
          return true;
        }
      }
      if (panel.querySelector("[data-testid='video-player']") || panel.querySelector(".main-videoPlayer-container")) {
        return true;
      }
    }
    return false;
  };
  const renderOverlays = () => {
    if (isVideoMode()) {
      cleanupContainer();
      return;
    }
    const panel = findPanel();
    if (!panel) return;
    const video = panel.querySelector("video");
    const mode = video !== null ? "canvas" : "cover";
    let target = null;
    if (mode === "canvas") {
      target = video.parentElement;
    } else {
      target = findTitleElement(panel);
    }
    if (!target || !target.parentElement) return;
    if (activeContainer) {
      const isAttached = document.body.contains(activeContainer);
      const modeChanged = activeMode !== mode;
      if (!isAttached || modeChanged) {
        cleanupContainer();
      }
    }
    if (!activeContainer) {
      activeContainer = document.createElement("div");
      activeContainer.className = "canvas-lyrics-container";
      activeMode = mode;
      if (mode === "canvas") {
        activeContainer.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;";
        if (getComputedStyle(target).position === "static") {
          target.style.position = "relative";
        }
        target.appendChild(activeContainer);
      } else {
        activeContainer.style.cssText = "pointer-events:none;width:100%;box-sizing:border-box;";
        target.parentElement.insertBefore(activeContainer, target);
      }
    }
    if (!activeRoot) {
      activeRoot = Spicetify.ReactDOM.createRoot(activeContainer);
    }
    let calculatedOffset = 90;
    if (mode === "canvas" && video) {
      calculatedOffset = getCanvasBottomOffset(panel, video);
    }
    activeRoot.render(
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        LyricOverlay,
        {
          lyricsData: currentLyricsData,
          progress: currentProgress,
          mode,
          bottomOffset: calculatedOffset
        }
      )
    );
  };
  const fetchCurrentLyrics = async () => {
    const track = Spicetify.Player.data.item;
    if (track) {
      currentLyricsData = await getLyrics(track);
      renderOverlays();
    }
  };
  Spicetify.Player.addEventListener("songchange", () => {
    cleanupContainer();
    currentLyricsData = null;
    currentProgress = 0;
    renderOverlays();
    fetchCurrentLyrics();
  });
  Spicetify.Player.addEventListener("onprogress", (e) => {
    currentProgress = e.data;
    renderOverlays();
  });
  setInterval(() => {
    renderOverlays();
  }, 1e3);
  window.addEventListener("resize", () => {
    renderOverlays();
  });
  fetchCurrentLyrics();
}
main();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3BpY2V0aWZ5LWdsb2JhbDpyZWFjdCIsICJzcGljZXRpZnktZ2xvYmFsOnJlYWN0L2pzeC1ydW50aW1lIiwgIi4uLy4uL3NyYy9seXJpY3MudHMiLCAiLi4vLi4vc3JjL0x5cmljT3ZlcmxheS50c3giLCAiLi4vLi4vc3JjL2FwcC50c3giXSwKICAic291cmNlc0NvbnRlbnQiOiBbIm1vZHVsZS5leHBvcnRzID0gU3BpY2V0aWZ5LlJlYWN0IiwgIm1vZHVsZS5leHBvcnRzID0gU3BpY2V0aWZ5LlJlYWN0SlNYIiwgImV4cG9ydCBpbnRlcmZhY2UgTHlyaWNMaW5lIHtcbiAgc3RhcnRUaW1lTXM6IG51bWJlcjtcbiAgZW5kVGltZU1zOiBudW1iZXI7XG4gIHRleHQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMeXJpY3NEYXRhIHtcbiAgcHJvdmlkZXI6IFwibmF0aXZlXCIgfCBcImxyY2xpYlwiO1xuICBsaW5lczogTHlyaWNMaW5lW107XG59XG5cbmxldCBscmNsaWJSZXRyeUFmdGVyID0gMDtcblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hOYXRpdmVMeXJpY3ModHJhY2tJZDogc3RyaW5nKTogUHJvbWlzZTxMeXJpY3NEYXRhIHwgbnVsbD4ge1xuICB0cnkge1xuICAgIGNvbnN0IHVybCA9IGBodHRwczovL3NwY2xpZW50LndnLnNwb3RpZnkuY29tL2NvbG9yLWx5cmljcy92Mi90cmFjay8ke3RyYWNrSWR9P2Zvcm1hdD1qc29uJnZvY2FsUmVtb3ZhbD1mYWxzZSZtYXJrZXQ9ZnJvbV90b2tlbmA7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBTcGljZXRpZnkuQ29zbW9zQXN5bmMuZ2V0KHVybCk7XG4gICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmx5cmljcyAmJiByZXNwb25zZS5seXJpY3MubGluZXMpIHtcbiAgICAgIGNvbnN0IGxpbmVzOiBMeXJpY0xpbmVbXSA9IHJlc3BvbnNlLmx5cmljcy5saW5lcy5tYXAoKGxpbmU6IGFueSkgPT4gKHtcbiAgICAgICAgc3RhcnRUaW1lTXM6IE51bWJlcihsaW5lLnN0YXJ0VGltZU1zKSxcbiAgICAgICAgZW5kVGltZU1zOiBOdW1iZXIobGluZS5zdGFydFRpbWVNcykgKyA1MDAwLFxuICAgICAgICB0ZXh0OiBsaW5lLndvcmRzIHx8IFwiXCJcbiAgICAgIH0pKTtcblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgbGluZXNbaV0uZW5kVGltZU1zID0gbGluZXNbaSArIDFdLnN0YXJ0VGltZU1zO1xuICAgICAgfVxuICAgICAgaWYgKGxpbmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgbGluZXNbbGluZXMubGVuZ3RoIC0gMV0uZW5kVGltZU1zID0gbGluZXNbbGluZXMubGVuZ3RoIC0gMV0uc3RhcnRUaW1lTXMgKyAxMDAwMDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcHJvdmlkZXI6IFwibmF0aXZlXCIsXG4gICAgICAgIGxpbmVzOiBsaW5lc1xuICAgICAgfTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJDYW52YXNMeXJpY3M6IEZhaWxlZCB0byBmZXRjaCBuYXRpdmUgbHlyaWNzXCIsIGVycik7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoTFJDTGliTHlyaWNzKHRyYWNrTmFtZTogc3RyaW5nLCBhcnRpc3ROYW1lOiBzdHJpbmcsIGFsYnVtTmFtZTogc3RyaW5nLCBkdXJhdGlvbk1zOiBudW1iZXIpOiBQcm9taXNlPEx5cmljc0RhdGEgfCBudWxsPiB7XG4gIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gIGlmIChub3cgPCBscmNsaWJSZXRyeUFmdGVyKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHF1ZXJ5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh7XG4gICAgICB0cmFja19uYW1lOiB0cmFja05hbWUsXG4gICAgICBhcnRpc3RfbmFtZTogYXJ0aXN0TmFtZSxcbiAgICAgIGFsYnVtX25hbWU6IGFsYnVtTmFtZSxcbiAgICAgIGR1cmF0aW9uOiAoZHVyYXRpb25NcyAvIDEwMDApLnRvU3RyaW5nKClcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKGBodHRwczovL2xyY2xpYi5uZXQvYXBpL2dldD8ke3F1ZXJ5LnRvU3RyaW5nKCl9YCk7XG5cbiAgICBpZiAocmVzLnN0YXR1cyA9PT0gNDI5KSB7XG4gICAgICBjb25zdCByZXRyeUFmdGVyU3RyID0gcmVzLmhlYWRlcnMuZ2V0KFwiUmV0cnktQWZ0ZXJcIik7XG4gICAgICBjb25zdCByZXRyeUFmdGVyU2VjcyA9IHJldHJ5QWZ0ZXJTdHIgPyBwYXJzZUludChyZXRyeUFmdGVyU3RyLCAxMCkgOiA2MDtcbiAgICAgIGxyY2xpYlJldHJ5QWZ0ZXIgPSBEYXRlLm5vdygpICsgcmV0cnlBZnRlclNlY3MgKiAxMDAwO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKCFyZXMub2spIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTFJDTElCIHJldHVybmVkICR7cmVzLnN0YXR1c31gKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzLmpzb24oKTtcbiAgICBpZiAoZGF0YSAmJiBkYXRhLnN5bmNlZEx5cmljcykge1xuICAgICAgY29uc3QgbGluZXMgPSBwYXJzZUxSQyhkYXRhLnN5bmNlZEx5cmljcyk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBwcm92aWRlcjogXCJscmNsaWJcIixcbiAgICAgICAgbGluZXNcbiAgICAgIH07XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiQ2FudmFzTHlyaWNzOiBGYWlsZWQgdG8gZmV0Y2ggTFJDTElCIGx5cmljc1wiLCBlcnIpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBwYXJzZUxSQyhscmM6IHN0cmluZyk6IEx5cmljTGluZVtdIHtcbiAgY29uc3QgbGluZXMgPSBscmMuc3BsaXQoXCJcXG5cIik7XG4gIGNvbnN0IHBhcnNlZExpbmVzOiBMeXJpY0xpbmVbXSA9IFtdO1xuICBjb25zdCB0aW1lUmVnZXggPSAvXFxbKFxcZHsyfSk6KFxcZHsyfSlcXC4oXFxkezIsM30pXFxdLztcblxuICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICBjb25zdCBtYXRjaCA9IHRpbWVSZWdleC5leGVjKGxpbmUpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgY29uc3QgbWluID0gcGFyc2VJbnQobWF0Y2hbMV0sIDEwKTtcbiAgICAgIGNvbnN0IHNlYyA9IHBhcnNlSW50KG1hdGNoWzJdLCAxMCk7XG4gICAgICBjb25zdCBtcyA9IHBhcnNlSW50KG1hdGNoWzNdLCAxMCkgKiAobWF0Y2hbM10ubGVuZ3RoID09PSAyID8gMTAgOiAxKTtcbiAgICAgIGNvbnN0IHRleHQgPSBsaW5lLnJlcGxhY2UodGltZVJlZ2V4LCBcIlwiKS50cmltKCk7XG4gICAgICBjb25zdCBzdGFydFRpbWVNcyA9IChtaW4gKiA2MCArIHNlYykgKiAxMDAwICsgbXM7XG5cbiAgICAgIHBhcnNlZExpbmVzLnB1c2goe1xuICAgICAgICBzdGFydFRpbWVNcyxcbiAgICAgICAgZW5kVGltZU1zOiAwLFxuICAgICAgICB0ZXh0XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcnNlZExpbmVzLmxlbmd0aCAtIDE7IGkrKykge1xuICAgIHBhcnNlZExpbmVzW2ldLmVuZFRpbWVNcyA9IHBhcnNlZExpbmVzW2kgKyAxXS5zdGFydFRpbWVNcztcbiAgfVxuICBpZiAocGFyc2VkTGluZXMubGVuZ3RoID4gMCkge1xuICAgIHBhcnNlZExpbmVzW3BhcnNlZExpbmVzLmxlbmd0aCAtIDFdLmVuZFRpbWVNcyA9IHBhcnNlZExpbmVzW3BhcnNlZExpbmVzLmxlbmd0aCAtIDFdLnN0YXJ0VGltZU1zICsgMTAwMDA7XG4gIH1cblxuICByZXR1cm4gcGFyc2VkTGluZXM7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRMeXJpY3ModHJhY2s6IFNwaWNldGlmeS5QbGF5ZXJUcmFjayk6IFByb21pc2U8THlyaWNzRGF0YSB8IG51bGw+IHtcbiAgaWYgKCF0cmFjayB8fCAhdHJhY2sudXJpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCB0cmFja0lkID0gdHJhY2sudXJpLnNwbGl0KFwiOlwiKS5wb3AoKTtcblxuICBpZiAodHJhY2tJZCkge1xuICAgIGNvbnN0IG5hdGl2ZUx5cmljcyA9IGF3YWl0IGZldGNoTmF0aXZlTHlyaWNzKHRyYWNrSWQpO1xuICAgIGlmIChuYXRpdmVMeXJpY3MpIHtcbiAgICAgIHJldHVybiBuYXRpdmVMeXJpY3M7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgbWV0YSA9IHRyYWNrLm1ldGFkYXRhO1xuICBpZiAobWV0YSAmJiBtZXRhLnRpdGxlICYmIG1ldGEuYXJ0aXN0X25hbWUgJiYgbWV0YS5hbGJ1bV90aXRsZSAmJiBtZXRhLmR1cmF0aW9uKSB7XG4gICAgY29uc3QgZmFsbGJhY2tMeXJpY3MgPSBhd2FpdCBmZXRjaExSQ0xpYkx5cmljcyhcbiAgICAgIG1ldGEudGl0bGUsXG4gICAgICBtZXRhLmFydGlzdF9uYW1lLFxuICAgICAgbWV0YS5hbGJ1bV90aXRsZSxcbiAgICAgIE51bWJlcihtZXRhLmR1cmF0aW9uKVxuICAgICk7XG4gICAgaWYgKGZhbGxiYWNrTHlyaWNzKSB7XG4gICAgICByZXR1cm4gZmFsbGJhY2tMeXJpY3M7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG4iLCAiaW1wb3J0IFJlYWN0LCB7IHVzZUVmZmVjdCwgdXNlU3RhdGUgfSBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCB0eXBlIHsgTHlyaWNzRGF0YSB9IGZyb20gXCIuL2x5cmljc1wiO1xuXG5pbnRlcmZhY2UgTHlyaWNPdmVybGF5UHJvcHMge1xuICBseXJpY3NEYXRhOiBMeXJpY3NEYXRhIHwgbnVsbDtcbiAgcHJvZ3Jlc3M6IG51bWJlcjtcbiAgbW9kZT86IFwiY2FudmFzXCIgfCBcImNvdmVyXCI7XG4gIGJvdHRvbU9mZnNldD86IG51bWJlcjtcbn1cblxuY29uc3Qgd2FpdGluZyA9IFwiX193YWl0aW5nX19cIjtcblxuY29uc3QgY2Fyb3VzZWxLZXlmcmFtZXMgPSBgXG4gIEBrZXlmcmFtZXMgY2Fyb3VzZWxFbnRlciB7XG4gICAgMCUge1xuICAgICAgb3BhY2l0eTogMDtcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWSgxMDAlKTtcbiAgICB9XG4gICAgMTAwJSB7XG4gICAgICBvcGFjaXR5OiAxO1xuICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKDApO1xuICAgIH1cbiAgfVxuXG4gIEBrZXlmcmFtZXMgY2Fyb3VzZWxFeGl0IHtcbiAgICAwJSB7XG4gICAgICBvcGFjaXR5OiAxO1xuICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKDApO1xuICAgIH1cbiAgICAxMDAlIHtcbiAgICAgIG9wYWNpdHk6IDA7XG4gICAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoLTEwMCUpO1xuICAgIH1cbiAgfVxuYDtcblxuZXhwb3J0IGNvbnN0IEx5cmljT3ZlcmxheTogUmVhY3QuRkM8THlyaWNPdmVybGF5UHJvcHM+ID0gKHtcbiAgbHlyaWNzRGF0YSxcbiAgcHJvZ3Jlc3MsXG4gIG1vZGUgPSBcImNhbnZhc1wiLFxuICBib3R0b21PZmZzZXQgPSA5MCxcbn0pID0+IHtcbiAgY29uc3QgW2FjdGl2ZVRleHQsIHNldEFjdGl2ZVRleHRdID0gdXNlU3RhdGU8c3RyaW5nPihcIlwiKTtcbiAgY29uc3QgW3ByZXZUZXh0LCBzZXRQcmV2VGV4dF0gPSB1c2VTdGF0ZTxzdHJpbmc+KFwiXCIpO1xuICBjb25zdCBbbGluZUtleSwgc2V0TGluZUtleV0gPSB1c2VTdGF0ZTxudW1iZXI+KC0xKTtcbiAgY29uc3QgW2lzVHJhbnNpdGlvbmluZywgc2V0SXNUcmFuc2l0aW9uaW5nXSA9IHVzZVN0YXRlPGJvb2xlYW4+KGZhbHNlKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghbHlyaWNzRGF0YSB8fCBseXJpY3NEYXRhLmxpbmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgc2V0QWN0aXZlVGV4dChcIlwiKTtcbiAgICAgIHNldFByZXZUZXh0KFwiXCIpO1xuICAgICAgc2V0TGluZUtleSgtMSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgYWN0aXZlSW5kZXggPSBseXJpY3NEYXRhLmxpbmVzLmZpbmRJbmRleChcbiAgICAgIChsaW5lKSA9PiBwcm9ncmVzcyA+PSBsaW5lLnN0YXJ0VGltZU1zICYmIHByb2dyZXNzIDwgbGluZS5lbmRUaW1lTXNcbiAgICApO1xuXG4gICAgaWYgKGFjdGl2ZUluZGV4ICE9PSAtMSkge1xuICAgICAgY29uc3QgdGV4dCA9IGx5cmljc0RhdGEubGluZXNbYWN0aXZlSW5kZXhdLnRleHQ7XG4gICAgICBpZiAoYWN0aXZlSW5kZXggIT09IGxpbmVLZXkpIHtcbiAgICAgICAgc2V0UHJldlRleHQoYWN0aXZlVGV4dCk7XG4gICAgICAgIHNldEFjdGl2ZVRleHQodGV4dCk7XG4gICAgICAgIHNldExpbmVLZXkoYWN0aXZlSW5kZXgpO1xuICAgICAgICBzZXRJc1RyYW5zaXRpb25pbmcodHJ1ZSk7XG5cbiAgICAgICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICBzZXRJc1RyYW5zaXRpb25pbmcoZmFsc2UpO1xuICAgICAgICAgIHNldFByZXZUZXh0KFwiXCIpO1xuICAgICAgICB9LCAzNTApO1xuICAgICAgICByZXR1cm4gKCkgPT4gY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbmV4dElkeCA9IGx5cmljc0RhdGEubGluZXMuZmluZEluZGV4KChsKSA9PiBsLnN0YXJ0VGltZU1zID4gcHJvZ3Jlc3MpO1xuICAgICAgbGV0IHNob3dJbmRpY2F0b3IgPSBmYWxzZTtcbiAgICAgIGlmIChuZXh0SWR4ICE9PSAtMSkge1xuICAgICAgICBjb25zdCBzdGFydE9mR2FwID0gbmV4dElkeCA9PT0gMCA/IDAgOiBseXJpY3NEYXRhLmxpbmVzW25leHRJZHggLSAxXS5lbmRUaW1lTXM7XG4gICAgICAgIGNvbnN0IGVuZE9mR2FwID0gbHlyaWNzRGF0YS5saW5lc1tuZXh0SWR4XS5zdGFydFRpbWVNcztcbiAgICAgICAgY29uc3QgZ2FwRHVyYXRpb24gPSBlbmRPZkdhcCAtIHN0YXJ0T2ZHYXA7XG4gICAgICAgIGlmIChnYXBEdXJhdGlvbiA+IDMwMDAgJiYgcHJvZ3Jlc3MgPj0gc3RhcnRPZkdhcCkge1xuICAgICAgICAgIHNob3dJbmRpY2F0b3IgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChzaG93SW5kaWNhdG9yKSB7XG4gICAgICAgIGlmIChsaW5lS2V5ICE9PSAtMikge1xuICAgICAgICAgIHNldFByZXZUZXh0KGFjdGl2ZVRleHQpO1xuICAgICAgICAgIHNldEFjdGl2ZVRleHQod2FpdGluZyk7XG4gICAgICAgICAgc2V0TGluZUtleSgtMik7XG4gICAgICAgICAgc2V0SXNUcmFuc2l0aW9uaW5nKHRydWUpO1xuXG4gICAgICAgICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHNldElzVHJhbnNpdGlvbmluZyhmYWxzZSk7XG4gICAgICAgICAgICBzZXRQcmV2VGV4dChcIlwiKTtcbiAgICAgICAgICB9LCAzNTApO1xuICAgICAgICAgIHJldHVybiAoKSA9PiBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobGluZUtleSAhPT0gLTEpIHtcbiAgICAgICAgICBzZXRBY3RpdmVUZXh0KFwiXCIpO1xuICAgICAgICAgIHNldFByZXZUZXh0KFwiXCIpO1xuICAgICAgICAgIHNldExpbmVLZXkoLTEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LCBbbHlyaWNzRGF0YSwgcHJvZ3Jlc3MsIGFjdGl2ZVRleHQsIGxpbmVLZXldKTtcblxuICBsZXQgZ2FwUHJvZ3Jlc3MgPSAwO1xuICBpZiAoYWN0aXZlVGV4dCA9PT0gd2FpdGluZyAmJiBseXJpY3NEYXRhKSB7XG4gICAgY29uc3QgbmV4dElkeCA9IGx5cmljc0RhdGEubGluZXMuZmluZEluZGV4KChsKSA9PiBsLnN0YXJ0VGltZU1zID4gcHJvZ3Jlc3MpO1xuICAgIGlmIChuZXh0SWR4ICE9PSAtMSkge1xuICAgICAgY29uc3Qgc3RhcnRPZkdhcCA9IG5leHRJZHggPT09IDAgPyAwIDogbHlyaWNzRGF0YS5saW5lc1tuZXh0SWR4IC0gMV0uZW5kVGltZU1zO1xuICAgICAgY29uc3QgZW5kT2ZHYXAgPSBseXJpY3NEYXRhLmxpbmVzW25leHRJZHhdLnN0YXJ0VGltZU1zO1xuICAgICAgY29uc3QgZ2FwRHVyYXRpb24gPSBlbmRPZkdhcCAtIHN0YXJ0T2ZHYXA7XG4gICAgICBnYXBQcm9ncmVzcyA9IE1hdGgubWluKDEsIE1hdGgubWF4KDAsIChwcm9ncmVzcyAtIHN0YXJ0T2ZHYXApIC8gZ2FwRHVyYXRpb24pKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCByZW5kZXJDb250ZW50ID0gKHRleHQ6IHN0cmluZywgaXNQcmV2OiBib29sZWFuKSA9PiB7XG4gICAgaWYgKHRleHQgPT09IHdhaXRpbmcpIHtcbiAgICAgIHJldHVybiAoXG4gICAgICAgIDxkaXYgc3R5bGU9e3tcbiAgICAgICAgICBkaXNwbGF5OiAnZmxleCcsXG4gICAgICAgICAgZ2FwOiAnNnB4JyxcbiAgICAgICAgICBhbGlnbkl0ZW1zOiAnY2VudGVyJyxcbiAgICAgICAgICBoZWlnaHQ6IG1vZGUgPT09IFwiY2FudmFzXCIgPyBcIjI0cHhcIiA6IFwiMjFweFwiLFxuICAgICAgICAgIG1hcmdpblRvcDogXCI0cHhcIlxuICAgICAgICB9fT5cbiAgICAgICAgICB7WzAsIDEsIDJdLm1hcChpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gaSAqIDAuMzMzO1xuICAgICAgICAgICAgY29uc3QgZW5kID0gKGkgKyAxKSAqIDAuMzMzO1xuICAgICAgICAgICAgbGV0IG9wYWNpdHkgPSAxO1xuICAgICAgICAgICAgaWYgKCFpc1ByZXYpIHtcbiAgICAgICAgICAgICAgaWYgKGdhcFByb2dyZXNzID49IGVuZCkgb3BhY2l0eSA9IDE7XG4gICAgICAgICAgICAgIGVsc2UgaWYgKGdhcFByb2dyZXNzIDw9IHN0YXJ0KSBvcGFjaXR5ID0gMC4zO1xuICAgICAgICAgICAgICBlbHNlIG9wYWNpdHkgPSAwLjMgKyAwLjcgKiAoKGdhcFByb2dyZXNzIC0gc3RhcnQpIC8gKGVuZCAtIHN0YXJ0KSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgIDxkaXYga2V5PXtpfSBzdHlsZT17e1xuICAgICAgICAgICAgICAgIHdpZHRoOiBtb2RlID09PSBcImNhbnZhc1wiID8gJzhweCcgOiAnNnB4JyxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IG1vZGUgPT09IFwiY2FudmFzXCIgPyAnOHB4JyA6ICc2cHgnLFxuICAgICAgICAgICAgICAgIGJvcmRlclJhZGl1czogJzUwJScsXG4gICAgICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBtb2RlID09PSBcImNhbnZhc1wiID8gJyNmZmZmZmYnIDogJ3ZhcigtLXRleHQtYmFzZSwgI2ZmZmZmZiknLFxuICAgICAgICAgICAgICAgIG9wYWNpdHksXG4gICAgICAgICAgICAgICAgYm94U2hhZG93OiBtb2RlID09PSBcImNhbnZhc1wiID8gXCIwIDJweCA0cHggcmdiYSgwLDAsMCwwLjUpXCIgOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgfX0gLz5cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHRleHQ7XG4gIH07XG5cbiAgaWYgKCFhY3RpdmVUZXh0ICYmICFwcmV2VGV4dCkgcmV0dXJuIG51bGw7XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2XG4gICAgICBzdHlsZT17e1xuICAgICAgICBwb3NpdGlvbjogbW9kZSA9PT0gXCJjYW52YXNcIiA/IFwiYWJzb2x1dGVcIiA6IFwicmVsYXRpdmVcIixcbiAgICAgICAgYm90dG9tOiBtb2RlID09PSBcImNhbnZhc1wiID8gYCR7Ym90dG9tT2Zmc2V0fXB4YCA6IFwiYXV0b1wiLFxuICAgICAgICBsZWZ0OiBtb2RlID09PSBcImNhbnZhc1wiID8gXCIyMHB4XCIgOiBcImF1dG9cIixcbiAgICAgICAgcmlnaHQ6IG1vZGUgPT09IFwiY2FudmFzXCIgPyBcIjIwcHhcIiA6IFwiYXV0b1wiLFxuICAgICAgICBtYXJnaW46IG1vZGUgPT09IFwiY292ZXJcIiA/IFwiMTJweCAwIDhweCAwXCIgOiBcIjBcIixcbiAgICAgICAgcGFkZGluZzogXCIwIDRweFwiLFxuICAgICAgICBwb2ludGVyRXZlbnRzOiBcIm5vbmVcIixcbiAgICAgICAgdGV4dEFsaWduOiBcImxlZnRcIixcbiAgICAgICAgd2lkdGg6IFwiMTAwJVwiLFxuICAgICAgICBib3hTaXppbmc6IFwiYm9yZGVyLWJveFwiLFxuICAgICAgICB6SW5kZXg6IDk5OTksXG4gICAgICAgIHRyYW5zaXRpb246IFwiYm90dG9tIDAuMTVzIGVhc2Utb3V0XCIsXG4gICAgICAgIG92ZXJmbG93OiBcImhpZGRlblwiLFxuICAgICAgfX1cbiAgICA+XG4gICAgICA8c3R5bGU+e2Nhcm91c2VsS2V5ZnJhbWVzfTwvc3R5bGU+XG5cbiAgICAgIDxkaXYgc3R5bGU9e3sgcG9zaXRpb246IFwicmVsYXRpdmVcIiwgd2lkdGg6IFwiMTAwJVwiIH19PlxuICAgICAgICB7aXNUcmFuc2l0aW9uaW5nICYmIHByZXZUZXh0ICYmIChcbiAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICAgIGxlZnQ6IDAsXG4gICAgICAgICAgICAgIHdpZHRoOiBcIjEwMCVcIixcbiAgICAgICAgICAgICAgY29sb3I6IG1vZGUgPT09IFwiY2FudmFzXCIgPyBcIiNmZmZmZmZcIiA6IFwidmFyKC0tdGV4dC1iYXNlLCAjZmZmZmZmKVwiLFxuICAgICAgICAgICAgICBmb250U2l6ZTogbW9kZSA9PT0gXCJjYW52YXNcIiA/IFwiMThweFwiIDogXCIxNnB4XCIsXG4gICAgICAgICAgICAgIGZvbnRXZWlnaHQ6IFwiNzAwXCIsXG4gICAgICAgICAgICAgIGxpbmVIZWlnaHQ6IFwiMS4zXCIsXG4gICAgICAgICAgICAgIHRleHRTaGFkb3c6IG1vZGUgPT09IFwiY2FudmFzXCIgPyBcIjAgMnB4IDhweCByZ2JhKDAsIDAsIDAsIDAuOTUpLCAwIDAgMTZweCByZ2JhKDAsIDAsIDAsIDAuOClcIiA6IFwibm9uZVwiLFxuICAgICAgICAgICAgICB3b3JkV3JhcDogXCJicmVhay13b3JkXCIsXG4gICAgICAgICAgICAgIGxldHRlclNwYWNpbmc6IFwiLTAuMDFlbVwiLFxuICAgICAgICAgICAgICBhbmltYXRpb246IFwiY2Fyb3VzZWxFeGl0IDAuMzVzIGN1YmljLWJlemllcigwLjIsIDAuOCwgMC4yLCAxKSBmb3J3YXJkc1wiLFxuICAgICAgICAgICAgfX1cbiAgICAgICAgICA+XG4gICAgICAgICAgICB7cmVuZGVyQ29udGVudChwcmV2VGV4dCwgdHJ1ZSl9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICl9XG5cbiAgICAgICAgPGRpdlxuICAgICAgICAgIGtleT17bGluZUtleX1cbiAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgY29sb3I6IG1vZGUgPT09IFwiY2FudmFzXCIgPyBcIiNmZmZmZmZcIiA6IFwidmFyKC0tdGV4dC1iYXNlLCAjZmZmZmZmKVwiLFxuICAgICAgICAgICAgZm9udFNpemU6IG1vZGUgPT09IFwiY2FudmFzXCIgPyBcIjE4cHhcIiA6IFwiMTZweFwiLFxuICAgICAgICAgICAgZm9udFdlaWdodDogXCI3MDBcIixcbiAgICAgICAgICAgIGxpbmVIZWlnaHQ6IFwiMS4zXCIsXG4gICAgICAgICAgICB0ZXh0U2hhZG93OiBtb2RlID09PSBcImNhbnZhc1wiID8gXCIwIDJweCA4cHggcmdiYSgwLCAwLCAwLCAwLjk1KSwgMCAwIDE2cHggcmdiYSgwLCAwLCAwLCAwLjgpXCIgOiBcIm5vbmVcIixcbiAgICAgICAgICAgIHdvcmRXcmFwOiBcImJyZWFrLXdvcmRcIixcbiAgICAgICAgICAgIGxldHRlclNwYWNpbmc6IFwiLTAuMDFlbVwiLFxuICAgICAgICAgICAgYW5pbWF0aW9uOiBpc1RyYW5zaXRpb25pbmdcbiAgICAgICAgICAgICAgPyBcImNhcm91c2VsRW50ZXIgMC4zNXMgY3ViaWMtYmV6aWVyKDAuMiwgMC44LCAwLjIsIDEpIGZvcndhcmRzXCJcbiAgICAgICAgICAgICAgOiBcIm5vbmVcIixcbiAgICAgICAgICB9fVxuICAgICAgICA+XG4gICAgICAgICAge3JlbmRlckNvbnRlbnQoYWN0aXZlVGV4dCwgZmFsc2UpfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufTtcbiIsICJpbXBvcnQgUmVhY3QgZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyBnZXRMeXJpY3MgfSBmcm9tIFwiLi9seXJpY3NcIjtcbmltcG9ydCB0eXBlIHsgTHlyaWNzRGF0YSB9IGZyb20gXCIuL2x5cmljc1wiO1xuaW1wb3J0IHsgTHlyaWNPdmVybGF5IH0gZnJvbSBcIi4vTHlyaWNPdmVybGF5XCI7XG5cbnR5cGUgRGlzcGxheU1vZGUgPSBcImNhbnZhc1wiIHwgXCJjb3ZlclwiO1xuXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuICB3aGlsZSAoIVNwaWNldGlmeT8uUGxheWVyIHx8ICFTcGljZXRpZnk/LlBsYXRmb3JtIHx8ICFTcGljZXRpZnk/LlJlYWN0RE9NKSB7XG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwKSk7XG4gIH1cblxuICBjb25zb2xlLmxvZyhcIkNhbnZhc0x5cmljczogRXh0ZW5zaW9uIGluaXRpYWxpemVkXCIpO1xuXG4gIGxldCBjdXJyZW50THlyaWNzRGF0YTogTHlyaWNzRGF0YSB8IG51bGwgPSBudWxsO1xuICBsZXQgY3VycmVudFByb2dyZXNzID0gMDtcblxuICBsZXQgYWN0aXZlUm9vdDogYW55ID0gbnVsbDtcbiAgbGV0IGFjdGl2ZUNvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgbGV0IGFjdGl2ZU1vZGU6IERpc3BsYXlNb2RlIHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3QgY2xlYW51cENvbnRhaW5lciA9ICgpID0+IHtcbiAgICBpZiAoYWN0aXZlQ29udGFpbmVyICYmIGFjdGl2ZUNvbnRhaW5lci5wYXJlbnRFbGVtZW50KSB7XG4gICAgICBhY3RpdmVDb250YWluZXIucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZChhY3RpdmVDb250YWluZXIpO1xuICAgIH1cbiAgICBhY3RpdmVSb290ID0gbnVsbDtcbiAgICBhY3RpdmVDb250YWluZXIgPSBudWxsO1xuICAgIGFjdGl2ZU1vZGUgPSBudWxsO1xuICB9O1xuXG4gIGNvbnN0IGZpbmRQYW5lbCA9ICgpOiBIVE1MRWxlbWVudCB8IG51bGwgPT4ge1xuICAgIGNvbnN0IHNlbGVjdG9ycyA9IFtcbiAgICAgIFwiLlJvb3RfX3JpZ2h0LXNpZGViYXJcIixcbiAgICAgIFwiW2RhdGEtdGVzdGlkPSdub3ctcGxheWluZy12aWV3J11cIixcbiAgICAgIFwiW2RhdGEtdGVzdGlkPSdOb3dQbGF5aW5nVmlldyddXCIsXG4gICAgICBcIlthcmlhLWxhYmVsPSdOb3cgcGxheWluZyB2aWV3J11cIixcbiAgICAgIFwiLm1haW4tbm93UGxheWluZ1ZpZXctY29udGVudFwiLFxuICAgICAgXCJhc2lkZVtjbGFzcyo9J1BhbmVsJ11cIixcbiAgICAgIFwiYXNpZGVcIixcbiAgICBdO1xuXG4gICAgZm9yIChjb25zdCBzZWwgb2Ygc2VsZWN0b3JzKSB7XG4gICAgICBjb25zdCBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsKTtcbiAgICAgIGlmIChlbCAmJiBlbCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgIHJldHVybiBlbDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH07XG5cbiAgY29uc3QgZmluZFRpdGxlRWxlbWVudCA9IChwYW5lbDogSFRNTEVsZW1lbnQpOiBIVE1MRWxlbWVudCB8IG51bGwgPT4ge1xuICAgIGNvbnN0IHRpdGxlU2VsZWN0b3JzID0gW1xuICAgICAgXCJbZGF0YS10ZXN0aWQ9J25vdy1wbGF5aW5nLXdpZGdldCddXCIsXG4gICAgICBcIltkYXRhLXRlc3RpZD0nY29udGV4dC1pdGVtLWluZm8nXVwiLFxuICAgICAgXCIubWFpbi1ub3dQbGF5aW5nVmlldy1jb250ZXh0SXRlbUluZm9cIixcbiAgICAgIFwiLm1haW4tdHJhY2tJbmZvLWNvbnRhaW5lclwiLFxuICAgICAgXCJbZGF0YS10ZXN0aWQ9J3RyYWNrLWluZm8nXVwiLFxuICAgIF07XG5cbiAgICBmb3IgKGNvbnN0IHNlbCBvZiB0aXRsZVNlbGVjdG9ycykge1xuICAgICAgY29uc3QgZWwgPSBwYW5lbC5xdWVyeVNlbGVjdG9yKHNlbCk7XG4gICAgICBpZiAoZWwgJiYgZWwgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xuICAgICAgICByZXR1cm4gZWw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbGluayA9IHBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCJhW2hyZWYqPScvdHJhY2svJ11cIikgfHwgcGFuZWwucXVlcnlTZWxlY3RvcihcImFbaHJlZio9Jy9hcnRpc3QvJ11cIik7XG4gICAgaWYgKGxpbmspIHtcbiAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGxpbmsuY2xvc2VzdChcImRpdlwiKTtcbiAgICAgIGlmIChjb250YWluZXIgJiYgY29udGFpbmVyIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQgJiYgY29udGFpbmVyICE9PSBwYW5lbCkge1xuICAgICAgICByZXR1cm4gY29udGFpbmVyO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9O1xuXG4gIGNvbnN0IGdldENhbnZhc0JvdHRvbU9mZnNldCA9IChwYW5lbDogSFRNTEVsZW1lbnQsIHZpZGVvOiBIVE1MRWxlbWVudCk6IG51bWJlciA9PiB7XG4gICAgY29uc3QgdmlkZW9SZWN0ID0gdmlkZW8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgaWYgKHZpZGVvUmVjdC5oZWlnaHQgPT09IDApIHJldHVybiA5MDtcblxuICAgIGxldCBhbmNob3I6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gICAgY29uc3QgYnV0dG9ucyA9IHBhbmVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCJidXR0b25cIik7XG4gICAgZm9yIChjb25zdCBidG4gb2YgYnV0dG9ucykge1xuICAgICAgY29uc3QgdHh0ID0gKGJ0bi50ZXh0Q29udGVudCB8fCBcIlwiKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgaWYgKHR4dC5pbmNsdWRlcyhcInZpZGVvXCIpIHx8IHR4dC5pbmNsdWRlcyhcInBhc3NhXCIpIHx8IHR4dC5pbmNsdWRlcyhcInN3aXRjaFwiKSB8fCB0eHQuaW5jbHVkZXMoXCJ2aWV3XCIpKSB7XG4gICAgICAgIGFuY2hvciA9IGJ0bjtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFhbmNob3IpIHtcbiAgICAgIGFuY2hvciA9IGZpbmRUaXRsZUVsZW1lbnQocGFuZWwpO1xuICAgIH1cblxuICAgIGlmIChhbmNob3IpIHtcbiAgICAgIGNvbnN0IGFuY2hvclJlY3QgPSBhbmNob3IuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICBjb25zdCBvZmZzZXQgPSBNYXRoLnJvdW5kKHZpZGVvUmVjdC5ib3R0b20gLSBhbmNob3JSZWN0LnRvcCArIDgpO1xuICAgICAgaWYgKG9mZnNldCA+IDEwICYmIG9mZnNldCA8IHZpZGVvUmVjdC5oZWlnaHQpIHtcbiAgICAgICAgcmV0dXJuIG9mZnNldDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gOTA7XG4gIH07XG5cbiAgY29uc3QgaXNWaWRlb01vZGUgPSAoKTogYm9vbGVhbiA9PiB7XG4gICAgY29uc3QgaXRlbSA9IFNwaWNldGlmeS5QbGF5ZXI/LmRhdGE/Lml0ZW07XG4gICAgaWYgKGl0ZW0gJiYgKGl0ZW0udHlwZSAhPT0gXCJ0cmFja1wiKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgY29uc3QgcGFuZWwgPSBmaW5kUGFuZWwoKTtcbiAgICBpZiAocGFuZWwpIHtcbiAgICAgIGNvbnN0IGJ1dHRvbnMgPSBwYW5lbC5xdWVyeVNlbGVjdG9yQWxsKFwiYnV0dG9uXCIpO1xuICAgICAgZm9yIChjb25zdCBidG4gb2YgYnV0dG9ucykge1xuICAgICAgICBjb25zdCB0eHQgPSAoYnRuLnRleHRDb250ZW50IHx8IFwiXCIpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGlmICh0eHQuaW5jbHVkZXMoXCJhdWRpb1wiKSB8fCB0eHQuaW5jbHVkZXMoXCJzd2l0Y2ggdG8gYXVkaW9cIikpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAocGFuZWwucXVlcnlTZWxlY3RvcihcIltkYXRhLXRlc3RpZD0ndmlkZW8tcGxheWVyJ11cIikgfHwgcGFuZWwucXVlcnlTZWxlY3RvcihcIi5tYWluLXZpZGVvUGxheWVyLWNvbnRhaW5lclwiKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgY29uc3QgcmVuZGVyT3ZlcmxheXMgPSAoKSA9PiB7XG4gICAgaWYgKGlzVmlkZW9Nb2RlKCkpIHtcbiAgICAgIGNsZWFudXBDb250YWluZXIoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBwYW5lbCA9IGZpbmRQYW5lbCgpO1xuICAgIGlmICghcGFuZWwpIHJldHVybjtcblxuICAgIGNvbnN0IHZpZGVvID0gcGFuZWwucXVlcnlTZWxlY3RvcihcInZpZGVvXCIpO1xuICAgIGNvbnN0IG1vZGU6IERpc3BsYXlNb2RlID0gdmlkZW8gIT09IG51bGwgPyBcImNhbnZhc1wiIDogXCJjb3ZlclwiO1xuXG4gICAgbGV0IHRhcmdldDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgICBpZiAobW9kZSA9PT0gXCJjYW52YXNcIikge1xuICAgICAgdGFyZ2V0ID0gdmlkZW8hLnBhcmVudEVsZW1lbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldCA9IGZpbmRUaXRsZUVsZW1lbnQocGFuZWwpO1xuICAgIH1cblxuICAgIGlmICghdGFyZ2V0IHx8ICF0YXJnZXQucGFyZW50RWxlbWVudCkgcmV0dXJuO1xuXG4gICAgaWYgKGFjdGl2ZUNvbnRhaW5lcikge1xuICAgICAgY29uc3QgaXNBdHRhY2hlZCA9IGRvY3VtZW50LmJvZHkuY29udGFpbnMoYWN0aXZlQ29udGFpbmVyKTtcbiAgICAgIGNvbnN0IG1vZGVDaGFuZ2VkID0gYWN0aXZlTW9kZSAhPT0gbW9kZTtcblxuICAgICAgaWYgKCFpc0F0dGFjaGVkIHx8IG1vZGVDaGFuZ2VkKSB7XG4gICAgICAgIGNsZWFudXBDb250YWluZXIoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIWFjdGl2ZUNvbnRhaW5lcikge1xuICAgICAgYWN0aXZlQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgIGFjdGl2ZUNvbnRhaW5lci5jbGFzc05hbWUgPSBcImNhbnZhcy1seXJpY3MtY29udGFpbmVyXCI7XG4gICAgICBhY3RpdmVNb2RlID0gbW9kZTtcblxuICAgICAgaWYgKG1vZGUgPT09IFwiY2FudmFzXCIpIHtcbiAgICAgICAgYWN0aXZlQ29udGFpbmVyLnN0eWxlLmNzc1RleHQgPVxuICAgICAgICAgIFwicG9zaXRpb246YWJzb2x1dGU7dG9wOjA7bGVmdDowO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7cG9pbnRlci1ldmVudHM6bm9uZTt6LWluZGV4Ojk5OTk7XCI7XG4gICAgICAgIGlmIChnZXRDb21wdXRlZFN0eWxlKHRhcmdldCkucG9zaXRpb24gPT09IFwic3RhdGljXCIpIHtcbiAgICAgICAgICB0YXJnZXQuc3R5bGUucG9zaXRpb24gPSBcInJlbGF0aXZlXCI7XG4gICAgICAgIH1cbiAgICAgICAgdGFyZ2V0LmFwcGVuZENoaWxkKGFjdGl2ZUNvbnRhaW5lcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhY3RpdmVDb250YWluZXIuc3R5bGUuY3NzVGV4dCA9IFwicG9pbnRlci1ldmVudHM6bm9uZTt3aWR0aDoxMDAlO2JveC1zaXppbmc6Ym9yZGVyLWJveDtcIjtcbiAgICAgICAgdGFyZ2V0LnBhcmVudEVsZW1lbnQuaW5zZXJ0QmVmb3JlKGFjdGl2ZUNvbnRhaW5lciwgdGFyZ2V0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIWFjdGl2ZVJvb3QpIHtcbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgIGFjdGl2ZVJvb3QgPSBTcGljZXRpZnkuUmVhY3RET00uY3JlYXRlUm9vdChhY3RpdmVDb250YWluZXIpO1xuICAgIH1cblxuICAgIGxldCBjYWxjdWxhdGVkT2Zmc2V0ID0gOTA7XG4gICAgaWYgKG1vZGUgPT09IFwiY2FudmFzXCIgJiYgdmlkZW8pIHtcbiAgICAgIGNhbGN1bGF0ZWRPZmZzZXQgPSBnZXRDYW52YXNCb3R0b21PZmZzZXQocGFuZWwsIHZpZGVvKTtcbiAgICB9XG5cbiAgICBhY3RpdmVSb290LnJlbmRlcihcbiAgICAgIDxMeXJpY092ZXJsYXlcbiAgICAgICAgbHlyaWNzRGF0YT17Y3VycmVudEx5cmljc0RhdGF9XG4gICAgICAgIHByb2dyZXNzPXtjdXJyZW50UHJvZ3Jlc3N9XG4gICAgICAgIG1vZGU9e21vZGV9XG4gICAgICAgIGJvdHRvbU9mZnNldD17Y2FsY3VsYXRlZE9mZnNldH1cbiAgICAgIC8+XG4gICAgKTtcbiAgfTtcblxuICBjb25zdCBmZXRjaEN1cnJlbnRMeXJpY3MgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgdHJhY2sgPSBTcGljZXRpZnkuUGxheWVyLmRhdGEuaXRlbTtcbiAgICBpZiAodHJhY2spIHtcbiAgICAgIGN1cnJlbnRMeXJpY3NEYXRhID0gYXdhaXQgZ2V0THlyaWNzKHRyYWNrKTtcbiAgICAgIHJlbmRlck92ZXJsYXlzKCk7XG4gICAgfVxuICB9O1xuXG4gIFNwaWNldGlmeS5QbGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcihcInNvbmdjaGFuZ2VcIiwgKCkgPT4ge1xuICAgIGNsZWFudXBDb250YWluZXIoKTtcbiAgICBjdXJyZW50THlyaWNzRGF0YSA9IG51bGw7XG4gICAgY3VycmVudFByb2dyZXNzID0gMDtcbiAgICByZW5kZXJPdmVybGF5cygpO1xuICAgIGZldGNoQ3VycmVudEx5cmljcygpO1xuICB9KTtcblxuICBTcGljZXRpZnkuUGxheWVyLmFkZEV2ZW50TGlzdGVuZXIoXCJvbnByb2dyZXNzXCIsIChlOiBhbnkpID0+IHtcbiAgICBjdXJyZW50UHJvZ3Jlc3MgPSBlLmRhdGE7XG4gICAgcmVuZGVyT3ZlcmxheXMoKTtcbiAgfSk7XG5cbiAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgIHJlbmRlck92ZXJsYXlzKCk7XG4gIH0sIDEwMDApO1xuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicmVzaXplXCIsICgpID0+IHtcbiAgICByZW5kZXJPdmVybGF5cygpO1xuICB9KTtcblxuICBmZXRjaEN1cnJlbnRMeXJpY3MoKTtcbn1cblxubWFpbigpOyJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7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
;
    })();
    /* --- END --- */;
  } catch (err) {
    const msg = err.message === "Timeout" ? `Dependency timeout` : `Crashed`;
    window.Spicetify?.showNotification(`\u26A0\uFE0F ${appId}: ${msg} (check console for more info)`, true);
    console.error(`[${appId}] Error:`, err);
  }
})();
