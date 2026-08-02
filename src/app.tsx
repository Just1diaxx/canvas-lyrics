import React from "react";
import { getLyrics } from "./lyrics";
import type { LyricsData } from "./lyrics";
import { LyricOverlay } from "./LyricOverlay";

type DisplayMode = "canvas" | "cover";

async function main() {
  while (!Spicetify?.Player || !Spicetify?.Platform || !Spicetify?.ReactDOM) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("CanvasLyrics: Extension initialized");

  let currentLyricsData: LyricsData | null = null;
  let currentProgress = 0;

  let activeRoot: any = null;
  let activeContainer: HTMLElement | null = null;
  let activeMode: DisplayMode | null = null;

  const cleanupContainer = () => {
    if (activeContainer && activeContainer.parentElement) {
      activeContainer.parentElement.removeChild(activeContainer);
    }
    activeRoot = null;
    activeContainer = null;
    activeMode = null;
  };

  const findPanel = (): HTMLElement | null => {
    const selectors = [
      ".Root__right-sidebar",
      "[data-testid='now-playing-view']",
      "[data-testid='NowPlayingView']",
      "[aria-label='Now playing view']",
      ".main-nowPlayingView-content",
      "aside[class*='Panel']",
      "aside",
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el instanceof HTMLElement) {
        return el;
      }
    }
    return null;
  };

  const findTitleElement = (panel: HTMLElement): HTMLElement | null => {
    const titleSelectors = [
      "[data-testid='now-playing-widget']",
      "[data-testid='context-item-info']",
      ".main-nowPlayingView-contextItemInfo",
      ".main-trackInfo-container",
      "[data-testid='track-info']",
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

  const getCanvasBottomOffset = (panel: HTMLElement, video: HTMLElement): number => {
    const videoRect = video.getBoundingClientRect();
    if (videoRect.height === 0) return 90;

    let anchor: HTMLElement | null = null;
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

  const isVideoMode = (): boolean => {
    const item = Spicetify.Player?.data?.item;
    if (item && (item.type !== "track")) {
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
    const mode: DisplayMode = video !== null ? "canvas" : "cover";

    let target: HTMLElement | null = null;
    if (mode === "canvas") {
      target = video!.parentElement;
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
        activeContainer.style.cssText =
          "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;";
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
      // @ts-ignore
      activeRoot = Spicetify.ReactDOM.createRoot(activeContainer);
    }

    let calculatedOffset = 90;
    if (mode === "canvas" && video) {
      calculatedOffset = getCanvasBottomOffset(panel, video);
    }

    activeRoot.render(
      <LyricOverlay
        lyricsData={currentLyricsData}
        progress={currentProgress}
        mode={mode}
        bottomOffset={calculatedOffset}
      />
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

  Spicetify.Player.addEventListener("onprogress", (e: any) => {
    currentProgress = e.data;
    renderOverlays();
  });

  setInterval(() => {
    renderOverlays();
  }, 1000);

  window.addEventListener("resize", () => {
    renderOverlays();
  });

  fetchCurrentLyrics();
}

main();