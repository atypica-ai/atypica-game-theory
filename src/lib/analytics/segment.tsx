"use client";
import { useMediaQuery } from "@/hooks/use-media-query";
import { AnalyticsBrowser } from "@segment/analytics-next";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cn } from "../utils";
import { trackUserAction } from "./actions";
import { calcIntercomUserHash, segmentAnalyticsWriteKey } from "./config";

// 用一个模块级变量存储 analytics 实例
let analyticsInstance: AnalyticsBrowser | null = null;

async function loadSegmentAnalytics(): Promise<AnalyticsBrowser | null> {
  if (analyticsInstance) return analyticsInstance;
  try {
    const writeKey = await segmentAnalyticsWriteKey();
    if (writeKey) {
      analyticsInstance = AnalyticsBrowser.load({ writeKey });
    }
    return analyticsInstance;
  } catch (error) {
    console.error("Failed to load Segment Analytics:", error);
    throw error;
  }
}

// 卸载 Segment Analytics
async function unloadSegmentAnalytics() {
  if (analyticsInstance) {
    // 执行任何需要的清理
    analyticsInstance = null;
  }
}

// 实用工具函数，用于追踪页面浏览
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function trackPage(properties?: Record<string, any>) {
  if (analyticsInstance) {
    analyticsInstance.page(properties);
  }
}

// 实用工具函数，用于追踪事件
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function trackEvent(event: string, properties?: Record<string, any>) {
  if (analyticsInstance) {
    analyticsInstance.track(event, properties);
  }
}

export function SegmentAnalytics() {
  const pathname = usePathname();
  const { status, data: session } = useSession();
  const [isSegmentLoaded, setIsSegmentLoaded] = useState(false);
  const isMediaSm = useMediaQuery("sm");

  useEffect(() => {
    const segmentPostLoad = (analyticsInstance: AnalyticsBrowser) => {
      analyticsInstance.page();
      if (session?.user) {
        const userId = session.user.id.toString();
        // 前端 identify 初始化 intercom
        analyticsInstance.identify(
          userId,
          { email: session.user.email },
          { integrations: { Intercom: { user_hash: calcIntercomUserHash(userId) } } },
        );
        // 后端 track 上报完整信息
        trackUserAction();
      }
    };
    if (status === "authenticated" && !isSegmentLoaded) {
      // 用户登录后加载 Segment
      loadSegmentAnalytics()
        .then(() => {
          setIsSegmentLoaded(true);
          // load 的一刻，立即 page 一下
          if (analyticsInstance) {
            segmentPostLoad(analyticsInstance);
          }
        })
        .catch((err) => console.error("Failed to load Segment:", err));
    } else if (status !== "authenticated" && isSegmentLoaded) {
      // 用户登出后卸载 Segment
      unloadSegmentAnalytics();
      setIsSegmentLoaded(false);
    }
  }, [status, isSegmentLoaded, session?.user]);

  useEffect(() => {
    // 页面切换时候，上报 page view
    console.debug(`[trackPage] pathname changed to ${pathname}`);
    trackPage();
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).intercomSettings = {
      hide_default_launcher: !isMediaSm,
    };
    if (typeof window.Intercom !== "undefined") {
      window.Intercom("update", {
        hide_default_launcher: !isMediaSm,
      });
    }
  }, [isMediaSm]);

  const showIntercom = useCallback(() => {
    if (typeof window.Intercom !== "undefined") {
      window.Intercom("show");
    }
  }, []);

  return (
    <>
      <div
        className={cn(
          "sm:hidden",
          "fixed right-3 bottom-44",
          "rounded-full size-10 flex items-center justify-center",
          "bg-black text-white",
        )}
        onClick={() => showIntercom()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 32" className="size-5">
          <path
            fill="#fff"
            d="M28 32s-4.714-1.855-8.527-3.34H3.437C1.54 28.66 0 27.026 0 25.013V3.644C0 1.633 1.54 0 3.437 0h21.125c1.898 0 3.437 1.632 3.437 3.645v18.404H28V32zm-4.139-11.982a.88.88 0 00-1.292-.105c-.03.026-3.015 2.681-8.57 2.681-5.486 0-8.517-2.636-8.571-2.684a.88.88 0 00-1.29.107 1.01 1.01 0 00-.219.708.992.992 0 00.318.664c.142.128 3.537 3.15 9.762 3.15 6.226 0 9.621-3.022 9.763-3.15a.992.992 0 00.317-.664 1.01 1.01 0 00-.218-.707z"
          ></path>
        </svg>
      </div>
    </>
  );
}
