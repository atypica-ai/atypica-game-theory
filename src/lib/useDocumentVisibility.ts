"use client";
import { useEffect, useState } from "react";

export function useDocumentVisibility() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof document !== "undefined") {
      return document.visibilityState === "visible";
    }
    return false; // 默认为不可见，在服务器端不渲染
  });
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
  return { isDocumentVisible: isVisible };
}
