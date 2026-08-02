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
    console.info(`%c[${"canvaslyrics"}:${"extension"}] %cv${"1.0.0"} %cinitialized`, "color: #1DB954; font-weight: bold", "color: #888", "color: unset");
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
              children: prevText
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
              children: activeText
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
  const renderOverlays = () => {
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3BpY2V0aWZ5LWdsb2JhbDpyZWFjdCIsICJzcGljZXRpZnktZ2xvYmFsOnJlYWN0L2pzeC1ydW50aW1lIiwgIi4uLy4uL3NyYy9seXJpY3MudHMiLCAiLi4vLi4vc3JjL0x5cmljT3ZlcmxheS50c3giLCAiLi4vLi4vc3JjL2FwcC50c3giXSwKICAic291cmNlc0NvbnRlbnQiOiBbIm1vZHVsZS5leHBvcnRzID0gU3BpY2V0aWZ5LlJlYWN0IiwgIm1vZHVsZS5leHBvcnRzID0gU3BpY2V0aWZ5LlJlYWN0SlNYIiwgImV4cG9ydCBpbnRlcmZhY2UgTHlyaWNMaW5lIHtcbiAgc3RhcnRUaW1lTXM6IG51bWJlcjtcbiAgZW5kVGltZU1zOiBudW1iZXI7XG4gIHRleHQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMeXJpY3NEYXRhIHtcbiAgcHJvdmlkZXI6IFwibmF0aXZlXCIgfCBcImxyY2xpYlwiO1xuICBsaW5lczogTHlyaWNMaW5lW107XG59XG5cbmxldCBscmNsaWJSZXRyeUFmdGVyID0gMDtcblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hOYXRpdmVMeXJpY3ModHJhY2tJZDogc3RyaW5nKTogUHJvbWlzZTxMeXJpY3NEYXRhIHwgbnVsbD4ge1xuICB0cnkge1xuICAgIGNvbnN0IHVybCA9IGBodHRwczovL3NwY2xpZW50LndnLnNwb3RpZnkuY29tL2NvbG9yLWx5cmljcy92Mi90cmFjay8ke3RyYWNrSWR9P2Zvcm1hdD1qc29uJnZvY2FsUmVtb3ZhbD1mYWxzZSZtYXJrZXQ9ZnJvbV90b2tlbmA7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBTcGljZXRpZnkuQ29zbW9zQXN5bmMuZ2V0KHVybCk7XG4gICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmx5cmljcyAmJiByZXNwb25zZS5seXJpY3MubGluZXMpIHtcbiAgICAgIGNvbnN0IGxpbmVzOiBMeXJpY0xpbmVbXSA9IHJlc3BvbnNlLmx5cmljcy5saW5lcy5tYXAoKGxpbmU6IGFueSkgPT4gKHtcbiAgICAgICAgc3RhcnRUaW1lTXM6IE51bWJlcihsaW5lLnN0YXJ0VGltZU1zKSxcbiAgICAgICAgZW5kVGltZU1zOiBOdW1iZXIobGluZS5zdGFydFRpbWVNcykgKyA1MDAwLFxuICAgICAgICB0ZXh0OiBsaW5lLndvcmRzIHx8IFwiXCJcbiAgICAgIH0pKTtcblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgbGluZXNbaV0uZW5kVGltZU1zID0gbGluZXNbaSArIDFdLnN0YXJ0VGltZU1zO1xuICAgICAgfVxuICAgICAgaWYgKGxpbmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgbGluZXNbbGluZXMubGVuZ3RoIC0gMV0uZW5kVGltZU1zID0gbGluZXNbbGluZXMubGVuZ3RoIC0gMV0uc3RhcnRUaW1lTXMgKyAxMDAwMDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcHJvdmlkZXI6IFwibmF0aXZlXCIsXG4gICAgICAgIGxpbmVzOiBsaW5lc1xuICAgICAgfTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJDYW52YXNMeXJpY3M6IEZhaWxlZCB0byBmZXRjaCBuYXRpdmUgbHlyaWNzXCIsIGVycik7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoTFJDTGliTHlyaWNzKHRyYWNrTmFtZTogc3RyaW5nLCBhcnRpc3ROYW1lOiBzdHJpbmcsIGFsYnVtTmFtZTogc3RyaW5nLCBkdXJhdGlvbk1zOiBudW1iZXIpOiBQcm9taXNlPEx5cmljc0RhdGEgfCBudWxsPiB7XG4gIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gIGlmIChub3cgPCBscmNsaWJSZXRyeUFmdGVyKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHF1ZXJ5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh7XG4gICAgICB0cmFja19uYW1lOiB0cmFja05hbWUsXG4gICAgICBhcnRpc3RfbmFtZTogYXJ0aXN0TmFtZSxcbiAgICAgIGFsYnVtX25hbWU6IGFsYnVtTmFtZSxcbiAgICAgIGR1cmF0aW9uOiAoZHVyYXRpb25NcyAvIDEwMDApLnRvU3RyaW5nKClcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKGBodHRwczovL2xyY2xpYi5uZXQvYXBpL2dldD8ke3F1ZXJ5LnRvU3RyaW5nKCl9YCk7XG5cbiAgICBpZiAocmVzLnN0YXR1cyA9PT0gNDI5KSB7XG4gICAgICBjb25zdCByZXRyeUFmdGVyU3RyID0gcmVzLmhlYWRlcnMuZ2V0KFwiUmV0cnktQWZ0ZXJcIik7XG4gICAgICBjb25zdCByZXRyeUFmdGVyU2VjcyA9IHJldHJ5QWZ0ZXJTdHIgPyBwYXJzZUludChyZXRyeUFmdGVyU3RyLCAxMCkgOiA2MDtcbiAgICAgIGxyY2xpYlJldHJ5QWZ0ZXIgPSBEYXRlLm5vdygpICsgcmV0cnlBZnRlclNlY3MgKiAxMDAwO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKCFyZXMub2spIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTFJDTElCIHJldHVybmVkICR7cmVzLnN0YXR1c31gKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzLmpzb24oKTtcbiAgICBpZiAoZGF0YSAmJiBkYXRhLnN5bmNlZEx5cmljcykge1xuICAgICAgY29uc3QgbGluZXMgPSBwYXJzZUxSQyhkYXRhLnN5bmNlZEx5cmljcyk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBwcm92aWRlcjogXCJscmNsaWJcIixcbiAgICAgICAgbGluZXNcbiAgICAgIH07XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiQ2FudmFzTHlyaWNzOiBGYWlsZWQgdG8gZmV0Y2ggTFJDTElCIGx5cmljc1wiLCBlcnIpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBwYXJzZUxSQyhscmM6IHN0cmluZyk6IEx5cmljTGluZVtdIHtcbiAgY29uc3QgbGluZXMgPSBscmMuc3BsaXQoXCJcXG5cIik7XG4gIGNvbnN0IHBhcnNlZExpbmVzOiBMeXJpY0xpbmVbXSA9IFtdO1xuICBjb25zdCB0aW1lUmVnZXggPSAvXFxbKFxcZHsyfSk6KFxcZHsyfSlcXC4oXFxkezIsM30pXFxdLztcblxuICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICBjb25zdCBtYXRjaCA9IHRpbWVSZWdleC5leGVjKGxpbmUpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgY29uc3QgbWluID0gcGFyc2VJbnQobWF0Y2hbMV0sIDEwKTtcbiAgICAgIGNvbnN0IHNlYyA9IHBhcnNlSW50KG1hdGNoWzJdLCAxMCk7XG4gICAgICBjb25zdCBtcyA9IHBhcnNlSW50KG1hdGNoWzNdLCAxMCkgKiAobWF0Y2hbM10ubGVuZ3RoID09PSAyID8gMTAgOiAxKTtcbiAgICAgIGNvbnN0IHRleHQgPSBsaW5lLnJlcGxhY2UodGltZVJlZ2V4LCBcIlwiKS50cmltKCk7XG4gICAgICBjb25zdCBzdGFydFRpbWVNcyA9IChtaW4gKiA2MCArIHNlYykgKiAxMDAwICsgbXM7XG5cbiAgICAgIHBhcnNlZExpbmVzLnB1c2goe1xuICAgICAgICBzdGFydFRpbWVNcyxcbiAgICAgICAgZW5kVGltZU1zOiAwLFxuICAgICAgICB0ZXh0XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcnNlZExpbmVzLmxlbmd0aCAtIDE7IGkrKykge1xuICAgIHBhcnNlZExpbmVzW2ldLmVuZFRpbWVNcyA9IHBhcnNlZExpbmVzW2kgKyAxXS5zdGFydFRpbWVNcztcbiAgfVxuICBpZiAocGFyc2VkTGluZXMubGVuZ3RoID4gMCkge1xuICAgIHBhcnNlZExpbmVzW3BhcnNlZExpbmVzLmxlbmd0aCAtIDFdLmVuZFRpbWVNcyA9IHBhcnNlZExpbmVzW3BhcnNlZExpbmVzLmxlbmd0aCAtIDFdLnN0YXJ0VGltZU1zICsgMTAwMDA7XG4gIH1cblxuICByZXR1cm4gcGFyc2VkTGluZXM7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRMeXJpY3ModHJhY2s6IFNwaWNldGlmeS5QbGF5ZXJUcmFjayk6IFByb21pc2U8THlyaWNzRGF0YSB8IG51bGw+IHtcbiAgaWYgKCF0cmFjayB8fCAhdHJhY2sudXJpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCB0cmFja0lkID0gdHJhY2sudXJpLnNwbGl0KFwiOlwiKS5wb3AoKTtcblxuICBpZiAodHJhY2tJZCkge1xuICAgIGNvbnN0IG5hdGl2ZUx5cmljcyA9IGF3YWl0IGZldGNoTmF0aXZlTHlyaWNzKHRyYWNrSWQpO1xuICAgIGlmIChuYXRpdmVMeXJpY3MpIHtcbiAgICAgIHJldHVybiBuYXRpdmVMeXJpY3M7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgbWV0YSA9IHRyYWNrLm1ldGFkYXRhO1xuICBpZiAobWV0YSAmJiBtZXRhLnRpdGxlICYmIG1ldGEuYXJ0aXN0X25hbWUgJiYgbWV0YS5hbGJ1bV90aXRsZSAmJiBtZXRhLmR1cmF0aW9uKSB7XG4gICAgY29uc3QgZmFsbGJhY2tMeXJpY3MgPSBhd2FpdCBmZXRjaExSQ0xpYkx5cmljcyhcbiAgICAgIG1ldGEudGl0bGUsXG4gICAgICBtZXRhLmFydGlzdF9uYW1lLFxuICAgICAgbWV0YS5hbGJ1bV90aXRsZSxcbiAgICAgIE51bWJlcihtZXRhLmR1cmF0aW9uKVxuICAgICk7XG4gICAgaWYgKGZhbGxiYWNrTHlyaWNzKSB7XG4gICAgICByZXR1cm4gZmFsbGJhY2tMeXJpY3M7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG4iLCAiaW1wb3J0IFJlYWN0LCB7IHVzZUVmZmVjdCwgdXNlU3RhdGUgfSBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCB0eXBlIHsgTHlyaWNzRGF0YSB9IGZyb20gXCIuL2x5cmljc1wiO1xuXG5pbnRlcmZhY2UgTHlyaWNPdmVybGF5UHJvcHMge1xuICBseXJpY3NEYXRhOiBMeXJpY3NEYXRhIHwgbnVsbDtcbiAgcHJvZ3Jlc3M6IG51bWJlcjtcbiAgbW9kZT86IFwiY2FudmFzXCIgfCBcImNvdmVyXCI7XG4gIGJvdHRvbU9mZnNldD86IG51bWJlcjtcbn1cblxuY29uc3QgY2Fyb3VzZWxLZXlmcmFtZXMgPSBgXG4gIEBrZXlmcmFtZXMgY2Fyb3VzZWxFbnRlciB7XG4gICAgMCUge1xuICAgICAgb3BhY2l0eTogMDtcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWSgxMDAlKTtcbiAgICB9XG4gICAgMTAwJSB7XG4gICAgICBvcGFjaXR5OiAxO1xuICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKDApO1xuICAgIH1cbiAgfVxuXG4gIEBrZXlmcmFtZXMgY2Fyb3VzZWxFeGl0IHtcbiAgICAwJSB7XG4gICAgICBvcGFjaXR5OiAxO1xuICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKDApO1xuICAgIH1cbiAgICAxMDAlIHtcbiAgICAgIG9wYWNpdHk6IDA7XG4gICAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoLTEwMCUpO1xuICAgIH1cbiAgfVxuYDtcblxuZXhwb3J0IGNvbnN0IEx5cmljT3ZlcmxheTogUmVhY3QuRkM8THlyaWNPdmVybGF5UHJvcHM+ID0gKHtcbiAgbHlyaWNzRGF0YSxcbiAgcHJvZ3Jlc3MsXG4gIG1vZGUgPSBcImNhbnZhc1wiLFxuICBib3R0b21PZmZzZXQgPSA5MCxcbn0pID0+IHtcbiAgY29uc3QgW2FjdGl2ZVRleHQsIHNldEFjdGl2ZVRleHRdID0gdXNlU3RhdGU8c3RyaW5nPihcIlwiKTtcbiAgY29uc3QgW3ByZXZUZXh0LCBzZXRQcmV2VGV4dF0gPSB1c2VTdGF0ZTxzdHJpbmc+KFwiXCIpO1xuICBjb25zdCBbbGluZUtleSwgc2V0TGluZUtleV0gPSB1c2VTdGF0ZTxudW1iZXI+KC0xKTtcbiAgY29uc3QgW2lzVHJhbnNpdGlvbmluZywgc2V0SXNUcmFuc2l0aW9uaW5nXSA9IHVzZVN0YXRlPGJvb2xlYW4+KGZhbHNlKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghbHlyaWNzRGF0YSB8fCBseXJpY3NEYXRhLmxpbmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgc2V0QWN0aXZlVGV4dChcIlwiKTtcbiAgICAgIHNldFByZXZUZXh0KFwiXCIpO1xuICAgICAgc2V0TGluZUtleSgtMSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgYWN0aXZlSW5kZXggPSBseXJpY3NEYXRhLmxpbmVzLmZpbmRJbmRleChcbiAgICAgIChsaW5lKSA9PiBwcm9ncmVzcyA+PSBsaW5lLnN0YXJ0VGltZU1zICYmIHByb2dyZXNzIDwgbGluZS5lbmRUaW1lTXNcbiAgICApO1xuXG4gICAgaWYgKGFjdGl2ZUluZGV4ICE9PSAtMSkge1xuICAgICAgY29uc3QgdGV4dCA9IGx5cmljc0RhdGEubGluZXNbYWN0aXZlSW5kZXhdLnRleHQ7XG4gICAgICBpZiAodGV4dCAhPT0gYWN0aXZlVGV4dCkge1xuICAgICAgICBzZXRQcmV2VGV4dChhY3RpdmVUZXh0KTtcbiAgICAgICAgc2V0QWN0aXZlVGV4dCh0ZXh0KTtcbiAgICAgICAgc2V0TGluZUtleShhY3RpdmVJbmRleCk7XG4gICAgICAgIHNldElzVHJhbnNpdGlvbmluZyh0cnVlKTtcblxuICAgICAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHNldElzVHJhbnNpdGlvbmluZyhmYWxzZSk7XG4gICAgICAgICAgc2V0UHJldlRleHQoXCJcIik7XG4gICAgICAgIH0sIDM1MCk7XG4gICAgICAgIHJldHVybiAoKSA9PiBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzZXRBY3RpdmVUZXh0KFwiXCIpO1xuICAgICAgc2V0UHJldlRleHQoXCJcIik7XG4gICAgICBzZXRMaW5lS2V5KC0xKTtcbiAgICB9XG4gIH0sIFtseXJpY3NEYXRhLCBwcm9ncmVzcywgYWN0aXZlVGV4dF0pO1xuXG4gIGlmICghYWN0aXZlVGV4dCAmJiAhcHJldlRleHQpIHJldHVybiBudWxsO1xuXG4gIHJldHVybiAoXG4gICAgPGRpdlxuICAgICAgc3R5bGU9e3tcbiAgICAgICAgcG9zaXRpb246IG1vZGUgPT09IFwiY2FudmFzXCIgPyBcImFic29sdXRlXCIgOiBcInJlbGF0aXZlXCIsXG4gICAgICAgIGJvdHRvbTogbW9kZSA9PT0gXCJjYW52YXNcIiA/IGAke2JvdHRvbU9mZnNldH1weGAgOiBcImF1dG9cIixcbiAgICAgICAgbGVmdDogbW9kZSA9PT0gXCJjYW52YXNcIiA/IFwiMjBweFwiIDogXCJhdXRvXCIsXG4gICAgICAgIHJpZ2h0OiBtb2RlID09PSBcImNhbnZhc1wiID8gXCIyMHB4XCIgOiBcImF1dG9cIixcbiAgICAgICAgbWFyZ2luOiBtb2RlID09PSBcImNvdmVyXCIgPyBcIjEycHggMCA4cHggMFwiIDogXCIwXCIsXG4gICAgICAgIHBhZGRpbmc6IFwiMCA0cHhcIixcbiAgICAgICAgcG9pbnRlckV2ZW50czogXCJub25lXCIsXG4gICAgICAgIHRleHRBbGlnbjogXCJsZWZ0XCIsXG4gICAgICAgIHdpZHRoOiBcIjEwMCVcIixcbiAgICAgICAgYm94U2l6aW5nOiBcImJvcmRlci1ib3hcIixcbiAgICAgICAgekluZGV4OiA5OTk5LFxuICAgICAgICB0cmFuc2l0aW9uOiBcImJvdHRvbSAwLjE1cyBlYXNlLW91dFwiLFxuICAgICAgICBvdmVyZmxvdzogXCJoaWRkZW5cIixcbiAgICAgIH19XG4gICAgPlxuICAgICAgPHN0eWxlPntjYXJvdXNlbEtleWZyYW1lc308L3N0eWxlPlxuXG4gICAgICA8ZGl2IHN0eWxlPXt7IHBvc2l0aW9uOiBcInJlbGF0aXZlXCIsIHdpZHRoOiBcIjEwMCVcIiB9fT5cbiAgICAgICAge2lzVHJhbnNpdGlvbmluZyAmJiBwcmV2VGV4dCAmJiAoXG4gICAgICAgICAgPGRpdlxuICAgICAgICAgICAgc3R5bGU9e3tcbiAgICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgICBsZWZ0OiAwLFxuICAgICAgICAgICAgICB3aWR0aDogXCIxMDAlXCIsXG4gICAgICAgICAgICAgIGNvbG9yOiBtb2RlID09PSBcImNhbnZhc1wiID8gXCIjZmZmZmZmXCIgOiBcInZhcigtLXRleHQtYmFzZSwgI2ZmZmZmZilcIixcbiAgICAgICAgICAgICAgZm9udFNpemU6IG1vZGUgPT09IFwiY2FudmFzXCIgPyBcIjE4cHhcIiA6IFwiMTZweFwiLFxuICAgICAgICAgICAgICBmb250V2VpZ2h0OiBcIjcwMFwiLFxuICAgICAgICAgICAgICBsaW5lSGVpZ2h0OiBcIjEuM1wiLFxuICAgICAgICAgICAgICB0ZXh0U2hhZG93OiBtb2RlID09PSBcImNhbnZhc1wiID8gXCIwIDJweCA4cHggcmdiYSgwLCAwLCAwLCAwLjk1KSwgMCAwIDE2cHggcmdiYSgwLCAwLCAwLCAwLjgpXCIgOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgd29yZFdyYXA6IFwiYnJlYWstd29yZFwiLFxuICAgICAgICAgICAgICBsZXR0ZXJTcGFjaW5nOiBcIi0wLjAxZW1cIixcbiAgICAgICAgICAgICAgYW5pbWF0aW9uOiBcImNhcm91c2VsRXhpdCAwLjM1cyBjdWJpYy1iZXppZXIoMC4yLCAwLjgsIDAuMiwgMSkgZm9yd2FyZHNcIixcbiAgICAgICAgICAgIH19XG4gICAgICAgICAgPlxuICAgICAgICAgICAge3ByZXZUZXh0fVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICApfVxuXG4gICAgICAgIDxkaXZcbiAgICAgICAgICBrZXk9e2xpbmVLZXl9XG4gICAgICAgICAgc3R5bGU9e3tcbiAgICAgICAgICAgIGNvbG9yOiBtb2RlID09PSBcImNhbnZhc1wiID8gXCIjZmZmZmZmXCIgOiBcInZhcigtLXRleHQtYmFzZSwgI2ZmZmZmZilcIixcbiAgICAgICAgICAgIGZvbnRTaXplOiBtb2RlID09PSBcImNhbnZhc1wiID8gXCIxOHB4XCIgOiBcIjE2cHhcIixcbiAgICAgICAgICAgIGZvbnRXZWlnaHQ6IFwiNzAwXCIsXG4gICAgICAgICAgICBsaW5lSGVpZ2h0OiBcIjEuM1wiLFxuICAgICAgICAgICAgdGV4dFNoYWRvdzogbW9kZSA9PT0gXCJjYW52YXNcIiA/IFwiMCAycHggOHB4IHJnYmEoMCwgMCwgMCwgMC45NSksIDAgMCAxNnB4IHJnYmEoMCwgMCwgMCwgMC44KVwiIDogXCJub25lXCIsXG4gICAgICAgICAgICB3b3JkV3JhcDogXCJicmVhay13b3JkXCIsXG4gICAgICAgICAgICBsZXR0ZXJTcGFjaW5nOiBcIi0wLjAxZW1cIixcbiAgICAgICAgICAgIGFuaW1hdGlvbjogaXNUcmFuc2l0aW9uaW5nXG4gICAgICAgICAgICAgID8gXCJjYXJvdXNlbEVudGVyIDAuMzVzIGN1YmljLWJlemllcigwLjIsIDAuOCwgMC4yLCAxKSBmb3J3YXJkc1wiXG4gICAgICAgICAgICAgIDogXCJub25lXCIsXG4gICAgICAgICAgfX1cbiAgICAgICAgPlxuICAgICAgICAgIHthY3RpdmVUZXh0fVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufTtcbiIsICJpbXBvcnQgUmVhY3QgZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyBnZXRMeXJpY3MgfSBmcm9tIFwiLi9seXJpY3NcIjtcbmltcG9ydCB0eXBlIHsgTHlyaWNzRGF0YSB9IGZyb20gXCIuL2x5cmljc1wiO1xuaW1wb3J0IHsgTHlyaWNPdmVybGF5IH0gZnJvbSBcIi4vTHlyaWNPdmVybGF5XCI7XG5cbnR5cGUgRGlzcGxheU1vZGUgPSBcImNhbnZhc1wiIHwgXCJjb3ZlclwiO1xuXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuICB3aGlsZSAoIVNwaWNldGlmeT8uUGxheWVyIHx8ICFTcGljZXRpZnk/LlBsYXRmb3JtIHx8ICFTcGljZXRpZnk/LlJlYWN0RE9NKSB7XG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwKSk7XG4gIH1cblxuICBjb25zb2xlLmxvZyhcIkNhbnZhc0x5cmljczogRXh0ZW5zaW9uIGluaXRpYWxpemVkXCIpO1xuXG4gIGxldCBjdXJyZW50THlyaWNzRGF0YTogTHlyaWNzRGF0YSB8IG51bGwgPSBudWxsO1xuICBsZXQgY3VycmVudFByb2dyZXNzID0gMDtcblxuICBsZXQgYWN0aXZlUm9vdDogYW55ID0gbnVsbDtcbiAgbGV0IGFjdGl2ZUNvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgbGV0IGFjdGl2ZU1vZGU6IERpc3BsYXlNb2RlIHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3QgY2xlYW51cENvbnRhaW5lciA9ICgpID0+IHtcbiAgICBpZiAoYWN0aXZlQ29udGFpbmVyICYmIGFjdGl2ZUNvbnRhaW5lci5wYXJlbnRFbGVtZW50KSB7XG4gICAgICBhY3RpdmVDb250YWluZXIucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZChhY3RpdmVDb250YWluZXIpO1xuICAgIH1cbiAgICBhY3RpdmVSb290ID0gbnVsbDtcbiAgICBhY3RpdmVDb250YWluZXIgPSBudWxsO1xuICAgIGFjdGl2ZU1vZGUgPSBudWxsO1xuICB9O1xuXG4gIGNvbnN0IGZpbmRQYW5lbCA9ICgpOiBIVE1MRWxlbWVudCB8IG51bGwgPT4ge1xuICAgIGNvbnN0IHNlbGVjdG9ycyA9IFtcbiAgICAgIFwiLlJvb3RfX3JpZ2h0LXNpZGViYXJcIixcbiAgICAgIFwiW2RhdGEtdGVzdGlkPSdub3ctcGxheWluZy12aWV3J11cIixcbiAgICAgIFwiW2RhdGEtdGVzdGlkPSdOb3dQbGF5aW5nVmlldyddXCIsXG4gICAgICBcIlthcmlhLWxhYmVsPSdOb3cgcGxheWluZyB2aWV3J11cIixcbiAgICAgIFwiLm1haW4tbm93UGxheWluZ1ZpZXctY29udGVudFwiLFxuICAgICAgXCJhc2lkZVtjbGFzcyo9J1BhbmVsJ11cIixcbiAgICAgIFwiYXNpZGVcIixcbiAgICBdO1xuXG4gICAgZm9yIChjb25zdCBzZWwgb2Ygc2VsZWN0b3JzKSB7XG4gICAgICBjb25zdCBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsKTtcbiAgICAgIGlmIChlbCAmJiBlbCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgIHJldHVybiBlbDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH07XG5cbiAgY29uc3QgZmluZFRpdGxlRWxlbWVudCA9IChwYW5lbDogSFRNTEVsZW1lbnQpOiBIVE1MRWxlbWVudCB8IG51bGwgPT4ge1xuICAgIGNvbnN0IHRpdGxlU2VsZWN0b3JzID0gW1xuICAgICAgXCJbZGF0YS10ZXN0aWQ9J25vdy1wbGF5aW5nLXdpZGdldCddXCIsXG4gICAgICBcIltkYXRhLXRlc3RpZD0nY29udGV4dC1pdGVtLWluZm8nXVwiLFxuICAgICAgXCIubWFpbi1ub3dQbGF5aW5nVmlldy1jb250ZXh0SXRlbUluZm9cIixcbiAgICAgIFwiLm1haW4tdHJhY2tJbmZvLWNvbnRhaW5lclwiLFxuICAgICAgXCJbZGF0YS10ZXN0aWQ9J3RyYWNrLWluZm8nXVwiLFxuICAgIF07XG5cbiAgICBmb3IgKGNvbnN0IHNlbCBvZiB0aXRsZVNlbGVjdG9ycykge1xuICAgICAgY29uc3QgZWwgPSBwYW5lbC5xdWVyeVNlbGVjdG9yKHNlbCk7XG4gICAgICBpZiAoZWwgJiYgZWwgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xuICAgICAgICByZXR1cm4gZWw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbGluayA9IHBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCJhW2hyZWYqPScvdHJhY2svJ11cIikgfHwgcGFuZWwucXVlcnlTZWxlY3RvcihcImFbaHJlZio9Jy9hcnRpc3QvJ11cIik7XG4gICAgaWYgKGxpbmspIHtcbiAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGxpbmsuY2xvc2VzdChcImRpdlwiKTtcbiAgICAgIGlmIChjb250YWluZXIgJiYgY29udGFpbmVyIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQgJiYgY29udGFpbmVyICE9PSBwYW5lbCkge1xuICAgICAgICByZXR1cm4gY29udGFpbmVyO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9O1xuXG4gIGNvbnN0IGdldENhbnZhc0JvdHRvbU9mZnNldCA9IChwYW5lbDogSFRNTEVsZW1lbnQsIHZpZGVvOiBIVE1MRWxlbWVudCk6IG51bWJlciA9PiB7XG4gICAgY29uc3QgdmlkZW9SZWN0ID0gdmlkZW8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgaWYgKHZpZGVvUmVjdC5oZWlnaHQgPT09IDApIHJldHVybiA5MDtcblxuICAgIGxldCBhbmNob3I6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gICAgY29uc3QgYnV0dG9ucyA9IHBhbmVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCJidXR0b25cIik7XG4gICAgZm9yIChjb25zdCBidG4gb2YgYnV0dG9ucykge1xuICAgICAgY29uc3QgdHh0ID0gKGJ0bi50ZXh0Q29udGVudCB8fCBcIlwiKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgaWYgKHR4dC5pbmNsdWRlcyhcInZpZGVvXCIpIHx8IHR4dC5pbmNsdWRlcyhcInBhc3NhXCIpIHx8IHR4dC5pbmNsdWRlcyhcInN3aXRjaFwiKSB8fCB0eHQuaW5jbHVkZXMoXCJ2aWV3XCIpKSB7XG4gICAgICAgIGFuY2hvciA9IGJ0bjtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFhbmNob3IpIHtcbiAgICAgIGFuY2hvciA9IGZpbmRUaXRsZUVsZW1lbnQocGFuZWwpO1xuICAgIH1cblxuICAgIGlmIChhbmNob3IpIHtcbiAgICAgIGNvbnN0IGFuY2hvclJlY3QgPSBhbmNob3IuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICBjb25zdCBvZmZzZXQgPSBNYXRoLnJvdW5kKHZpZGVvUmVjdC5ib3R0b20gLSBhbmNob3JSZWN0LnRvcCArIDgpO1xuICAgICAgaWYgKG9mZnNldCA+IDEwICYmIG9mZnNldCA8IHZpZGVvUmVjdC5oZWlnaHQpIHtcbiAgICAgICAgcmV0dXJuIG9mZnNldDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gOTA7XG4gIH07XG5cbiAgY29uc3QgcmVuZGVyT3ZlcmxheXMgPSAoKSA9PiB7XG4gICAgY29uc3QgcGFuZWwgPSBmaW5kUGFuZWwoKTtcbiAgICBpZiAoIXBhbmVsKSByZXR1cm47XG5cbiAgICBjb25zdCB2aWRlbyA9IHBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCJ2aWRlb1wiKTtcbiAgICBjb25zdCBtb2RlOiBEaXNwbGF5TW9kZSA9IHZpZGVvICE9PSBudWxsID8gXCJjYW52YXNcIiA6IFwiY292ZXJcIjtcblxuICAgIGxldCB0YXJnZXQ6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gICAgaWYgKG1vZGUgPT09IFwiY2FudmFzXCIpIHtcbiAgICAgIHRhcmdldCA9IHZpZGVvIS5wYXJlbnRFbGVtZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXQgPSBmaW5kVGl0bGVFbGVtZW50KHBhbmVsKTtcbiAgICB9XG5cbiAgICBpZiAoIXRhcmdldCB8fCAhdGFyZ2V0LnBhcmVudEVsZW1lbnQpIHJldHVybjtcblxuICAgIGlmIChhY3RpdmVDb250YWluZXIpIHtcbiAgICAgIGNvbnN0IGlzQXR0YWNoZWQgPSBkb2N1bWVudC5ib2R5LmNvbnRhaW5zKGFjdGl2ZUNvbnRhaW5lcik7XG4gICAgICBjb25zdCBtb2RlQ2hhbmdlZCA9IGFjdGl2ZU1vZGUgIT09IG1vZGU7XG5cbiAgICAgIGlmICghaXNBdHRhY2hlZCB8fCBtb2RlQ2hhbmdlZCkge1xuICAgICAgICBjbGVhbnVwQ29udGFpbmVyKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFhY3RpdmVDb250YWluZXIpIHtcbiAgICAgIGFjdGl2ZUNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICBhY3RpdmVDb250YWluZXIuY2xhc3NOYW1lID0gXCJjYW52YXMtbHlyaWNzLWNvbnRhaW5lclwiO1xuICAgICAgYWN0aXZlTW9kZSA9IG1vZGU7XG5cbiAgICAgIGlmIChtb2RlID09PSBcImNhbnZhc1wiKSB7XG4gICAgICAgIGFjdGl2ZUNvbnRhaW5lci5zdHlsZS5jc3NUZXh0ID1cbiAgICAgICAgICBcInBvc2l0aW9uOmFic29sdXRlO3RvcDowO2xlZnQ6MDt3aWR0aDoxMDAlO2hlaWdodDoxMDAlO3BvaW50ZXItZXZlbnRzOm5vbmU7ei1pbmRleDo5OTk5O1wiO1xuICAgICAgICBpZiAoZ2V0Q29tcHV0ZWRTdHlsZSh0YXJnZXQpLnBvc2l0aW9uID09PSBcInN0YXRpY1wiKSB7XG4gICAgICAgICAgdGFyZ2V0LnN0eWxlLnBvc2l0aW9uID0gXCJyZWxhdGl2ZVwiO1xuICAgICAgICB9XG4gICAgICAgIHRhcmdldC5hcHBlbmRDaGlsZChhY3RpdmVDb250YWluZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWN0aXZlQ29udGFpbmVyLnN0eWxlLmNzc1RleHQgPSBcInBvaW50ZXItZXZlbnRzOm5vbmU7d2lkdGg6MTAwJTtib3gtc2l6aW5nOmJvcmRlci1ib3g7XCI7XG4gICAgICAgIHRhcmdldC5wYXJlbnRFbGVtZW50Lmluc2VydEJlZm9yZShhY3RpdmVDb250YWluZXIsIHRhcmdldCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFhY3RpdmVSb290KSB7XG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBhY3RpdmVSb290ID0gU3BpY2V0aWZ5LlJlYWN0RE9NLmNyZWF0ZVJvb3QoYWN0aXZlQ29udGFpbmVyKTtcbiAgICB9XG5cbiAgICBsZXQgY2FsY3VsYXRlZE9mZnNldCA9IDkwO1xuICAgIGlmIChtb2RlID09PSBcImNhbnZhc1wiICYmIHZpZGVvKSB7XG4gICAgICBjYWxjdWxhdGVkT2Zmc2V0ID0gZ2V0Q2FudmFzQm90dG9tT2Zmc2V0KHBhbmVsLCB2aWRlbyk7XG4gICAgfVxuXG4gICAgYWN0aXZlUm9vdC5yZW5kZXIoXG4gICAgICA8THlyaWNPdmVybGF5XG4gICAgICAgIGx5cmljc0RhdGE9e2N1cnJlbnRMeXJpY3NEYXRhfVxuICAgICAgICBwcm9ncmVzcz17Y3VycmVudFByb2dyZXNzfVxuICAgICAgICBtb2RlPXttb2RlfVxuICAgICAgICBib3R0b21PZmZzZXQ9e2NhbGN1bGF0ZWRPZmZzZXR9XG4gICAgICAvPlxuICAgICk7XG4gIH07XG5cbiAgY29uc3QgZmV0Y2hDdXJyZW50THlyaWNzID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHRyYWNrID0gU3BpY2V0aWZ5LlBsYXllci5kYXRhLml0ZW07XG4gICAgaWYgKHRyYWNrKSB7XG4gICAgICBjdXJyZW50THlyaWNzRGF0YSA9IGF3YWl0IGdldEx5cmljcyh0cmFjayk7XG4gICAgICByZW5kZXJPdmVybGF5cygpO1xuICAgIH1cbiAgfTtcblxuICBTcGljZXRpZnkuUGxheWVyLmFkZEV2ZW50TGlzdGVuZXIoXCJzb25nY2hhbmdlXCIsICgpID0+IHtcbiAgICBjbGVhbnVwQ29udGFpbmVyKCk7XG4gICAgY3VycmVudEx5cmljc0RhdGEgPSBudWxsO1xuICAgIGN1cnJlbnRQcm9ncmVzcyA9IDA7XG4gICAgcmVuZGVyT3ZlcmxheXMoKTtcbiAgICBmZXRjaEN1cnJlbnRMeXJpY3MoKTtcbiAgfSk7XG5cbiAgU3BpY2V0aWZ5LlBsYXllci5hZGRFdmVudExpc3RlbmVyKFwib25wcm9ncmVzc1wiLCAoZTogYW55KSA9PiB7XG4gICAgY3VycmVudFByb2dyZXNzID0gZS5kYXRhO1xuICAgIHJlbmRlck92ZXJsYXlzKCk7XG4gIH0pO1xuXG4gIHNldEludGVydmFsKCgpID0+IHtcbiAgICByZW5kZXJPdmVybGF5cygpO1xuICB9LCAxMDAwKTtcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCAoKSA9PiB7XG4gICAgcmVuZGVyT3ZlcmxheXMoKTtc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
;
    })();
    /* --- END --- */;
  } catch (err) {
    const msg = err.message === "Timeout" ? `Dependency timeout` : `Crashed`;
    window.Spicetify?.showNotification(`\u26A0\uFE0F ${appId}: ${msg} (check console for more info)`, true);
    console.error(`[${appId}] Error:`, err);
  }
})();
