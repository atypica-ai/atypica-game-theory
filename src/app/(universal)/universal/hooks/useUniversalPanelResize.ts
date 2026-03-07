"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

type DraggingMode = "chat-list" | "list-detail" | "chat-detail" | null;

const RESIZE_HANDLE_CLASS_NAME = cn(
  "relative h-full w-0 shrink-0 cursor-col-resize select-none",
  "before:absolute before:left-1/2 before:top-0 before:h-full before:w-3 before:-translate-x-1/2 before:content-['']",
  "[&>span]:absolute [&>span]:left-1/2 [&>span]:top-0 [&>span]:h-full [&>span]:w-px [&>span]:-translate-x-1/2 [&>span]:bg-border",
  "hover:[&>span]:bg-cyan-400/80 transition-colors",
);

export function useUniversalPanelResize() {
  const desktopContainerRef = useRef<HTMLDivElement | null>(null);
  const [threeColWidths, setThreeColWidths] = useState({ chat: 45, list: 26, detail: 29 });
  const [twoColWidths, setTwoColWidths] = useState({ chat: 62, detail: 38 });
  const threeColWidthsRef = useRef(threeColWidths);
  const [draggingMode, setDraggingMode] = useState<DraggingMode>(null);

  useEffect(() => {
    threeColWidthsRef.current = threeColWidths;
  }, [threeColWidths]);

  useEffect(() => {
    if (!draggingMode) return;

    const stopDragging = () => {
      setDraggingMode(null);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    const handleMouseMove = (event: MouseEvent) => {
      // If mouseup happened inside an iframe, mouseup may be lost on window.
      if (event.buttons === 0) {
        stopDragging();
        return;
      }

      const container = desktopContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;
      const pointerPercent = ((event.clientX - rect.left) / rect.width) * 100;

      if (draggingMode === "chat-list") {
        const prev = threeColWidthsRef.current;
        const total = prev.chat + prev.list;
        const nextChat = Math.min(Math.max(pointerPercent, 30), total - 18);
        setThreeColWidths({ chat: nextChat, list: total - nextChat, detail: prev.detail });
        return;
      }

      if (draggingMode === "list-detail") {
        const prev = threeColWidthsRef.current;
        const total = prev.list + prev.detail;
        const pointerInsideRight = pointerPercent - prev.chat;
        const nextList = Math.min(Math.max(pointerInsideRight, 18), total - 22);
        setThreeColWidths({ chat: prev.chat, list: nextList, detail: total - nextList });
        return;
      }

      const nextChat = Math.min(Math.max(pointerPercent, 35), 78);
      setTwoColWidths({ chat: nextChat, detail: 100 - nextChat });
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDragging);
    window.addEventListener("blur", stopDragging);
    document.addEventListener("mouseleave", stopDragging);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDragging);
      window.removeEventListener("blur", stopDragging);
      document.removeEventListener("mouseleave", stopDragging);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [draggingMode]);

  const startResizeChatBoundary = useCallback((collapseMiddlePanel: boolean) => {
    setDraggingMode(collapseMiddlePanel ? "chat-detail" : "chat-list");
  }, []);
  const startResizeListBoundary = useCallback(() => {
    setDraggingMode("list-detail");
  }, []);

  return {
    desktopContainerRef,
    threeColWidths,
    twoColWidths,
    isDragging: draggingMode !== null,
    resizeHandleClassName: RESIZE_HANDLE_CLASS_NAME,
    startResizeChatBoundary,
    startResizeListBoundary,
  };
}
