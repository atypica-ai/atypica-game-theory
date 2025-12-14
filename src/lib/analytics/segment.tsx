"use client";
import { AnalyticsBrowser } from "@segment/analytics-next";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { trackUserAction } from "./actions";
import { calcIntercomUserHash, segmentAnalyticsWriteKey } from "./config";
import { TAnalyticsEvent } from "./event";

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
export function trackPage(properties?: Record<string, any>) {
  if (analyticsInstance) {
    try {
      analyticsInstance.page(properties).catch(() => {});
    } catch {}
  }
}

// 实用工具函数，用于追踪事件
export function trackEvent<E extends keyof TAnalyticsEvent, T extends TAnalyticsEvent[E]>(
  event: E,
  ...args: T extends undefined ? [] : [properties: T]
) {
  if (analyticsInstance) {
    try {
      analyticsInstance.track(event, args[0]).catch(() => {});
    } catch {}
  }
}

export function SegmentAnalytics() {
  const pathname = usePathname();
  const { status, data: session } = useSession();
  const [isSegmentLoaded, setIsSegmentLoaded] = useState(false);

  useEffect(() => {
    const segmentPostLoad = (analyticsInstance: AnalyticsBrowser) => {
      analyticsInstance.page();
      if (session?.user) {
        const userId = session.user.id.toString();
        // 前端 identify 初始化 intercom
        analyticsInstance
          .identify(
            userId,
            { email: session.user.email },
            { integrations: { Intercom: { user_hash: calcIntercomUserHash(userId) } } },
          )
          .catch(() => {});
        // 后端 track 上报完整信息
        trackUserAction().catch(() => {});
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

  // return isSegmentLoaded ? <IntercomLauncher /> : null;
  return <></>;
}
