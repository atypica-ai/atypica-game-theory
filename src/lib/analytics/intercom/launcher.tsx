"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useState } from "react";

export function IntercomLauncher() {
  const gteLG = useMediaQuery("lg");
  const locale = useLocale();
  const [isExpanded, setIsExpanded] = useState(false);

  const showDefaultLauncher = gteLG;

  const contactText = locale === "zh-CN" ? "联系我们" : "Contact Us";

  const showIntercom = useCallback(() => {
    if (typeof window.Intercom !== "undefined") {
      window.Intercom("show");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).intercomSettings = {
      hide_default_launcher: !showDefaultLauncher,
    };
    if (typeof window.Intercom !== "undefined") {
      window.Intercom("update", {
        hide_default_launcher: !showDefaultLauncher,
      });
    }
  }, [showDefaultLauncher]);

  if (showDefaultLauncher) {
    return null;
  }

  return (
    <>
      <div className="fixed right-0 bottom-64 z-50">
        {isExpanded ? (
          // 展开状态：显示完整按钮组
          <div className="flex items-stretch h-10 rounded-l-lg overflow-hidden bg-black text-white shadow-lg border-l-2 border-y-2 border-white/10">
            <button
              onClick={() => {
                showIntercom();
              }}
              className="flex items-center gap-2 px-3 hover:bg-white/10 transition-colors"
              aria-label="Open customer support"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 28 32"
                className="size-3.5 shrink-0"
              >
                <path
                  fill="#fff"
                  d="M28 32s-4.714-1.855-8.527-3.34H3.437C1.54 28.66 0 27.026 0 25.013V3.644C0 1.633 1.54 0 3.437 0h21.125c1.898 0 3.437 1.632 3.437 3.645v18.404H28V32zm-4.139-11.982a.88.88 0 00-1.292-.105c-.03.026-3.015 2.681-8.57 2.681-5.486 0-8.517-2.636-8.571-2.684a.88.88 0 00-1.29.107 1.01 1.01 0 00-.219.708.992.992 0 00.318.664c.142.128 3.537 3.15 9.762 3.15 6.226 0 9.621-3.022 9.763-3.15a.992.992 0 00.317-.664 1.01 1.01 0 00-.218-.707z"
                ></path>
              </svg>
              <span className="text-sm whitespace-nowrap">{contactText}</span>
            </button>
            <div className="w-px bg-white/20" />
            <button
              onClick={() => setIsExpanded(false)}
              className="flex items-center justify-center w-10 hover:bg-white/10 transition-colors"
              aria-label="Collapse"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-4 shrink-0"
              >
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        ) : (
          // 收起状态：只显示小按钮
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center justify-center w-4 h-10 rounded-l-md bg-black text-white shadow-lg hover:bg-black/90 transition-colors border-l-2 border-y-2 border-white/10"
            aria-label="Expand menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-3 shrink-0"
            >
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 点击外部区域收起 */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsExpanded(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
