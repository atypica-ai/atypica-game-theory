import { proxiedImageCdnUrl } from "@/app/(system)/cdn/lib";
import { clsx, type ClassValue } from "clsx";
import { Locale } from "next-intl";
import { ImageLoader } from "next/image";
import { twMerge } from "tailwind-merge";
import { rootLogger } from "./logging";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateToken = (length = 16) =>
  Array(length)
    .fill(0)
    .map(
      () => "abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRTUVWXY346792"[Math.floor(Math.random() * 51)],
    )
    .join("");

// Debounce function
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

// Format tokens number/balance in human-readable format
export function formatTokensNumber(balance: number | string) {
  if (balance === null || balance === undefined) return "-";
  // Convert to number if it's a string
  const numBalance = typeof balance === "string" ? parseFloat(balance) : balance;
  if (isNaN(numBalance)) return "-";
  if (numBalance === 0) return "0";
  const absBalance = Math.abs(numBalance);
  if (absBalance >= 1000000) {
    return `${(numBalance / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 })}M`;
  } else if (absBalance >= 100000) {
    return `${(numBalance / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })}k`;
  } else if (absBalance >= 10000) {
    return `${(numBalance / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`;
  } else {
    return numBalance.toLocaleString();
  }
}

/**
 * 需要确保调用的节点在 NextIntlClientProvider 的里
 */
export function formatDate(date: Date | string, locale: Locale) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    // hour12: false,  // 有时候会服务端和客户端渲染不一致，0点的情况，会出现 0 和 24 两种值
  }).format(d);
}

// Format duration in milliseconds to human-readable format
export const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

export const formatDistanceToNow = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);

  if (years > 0) return `${years}y`;
  if (months > 0) return `${months}mo`;
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
};

/**
 * token-efficient-tools-2025-02-19 beta 版本的 claude 3.7
 * 输出的中文有时候是 uxxxxuxxxx 的形式，需要额外修复一下
 */
export function fixMalformedUnicodeString(str?: string) {
  str = str ?? "";
  if (!/(\\u|u)[0-9a-f]{4}.*(\\u|u)[0-9a-f]{4}/i.test(str)) {
    return str;
  } else {
    return str.replace(/(\\u|u)([0-9a-f]{4})/gi, (match, _u, hex) => {
      // 将十六进制转换为对应的Unicode字符
      return String.fromCharCode(parseInt(hex, 16));
    });
  }
}

// node 18 和 20 的 fetch 函数不直接使用代理，需要额外实现
// https://stackoverflow.com/questions/72306101/make-a-request-in-native-fetch-with-proxy-in-nodejs-18
export const proxiedImageLoader: ImageLoader = ({ src, width, quality }) => {
  const proxiedUrl = proxiedImageCdnUrl({
    src,
    width,
    quality,
  });
  return proxiedUrl;
};

// export const noImageLoader: ImageLoader = ({ src }) => src;

export function safeAbort(abortController: AbortController) {
  try {
    abortController.abort();
  } catch (error) {
    rootLogger.error(`Error during abort: ${(error as Error).message}`);
  }
}
