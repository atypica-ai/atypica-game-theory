import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
export function fixMalformedUnicodeString(str: string) {
  str = str ?? "";
  if (!/(\\u|u)[0-9a-f]{4}.*(\\u|u)[0-9a-f]{4}/i.test(str)) {
    return str;
  } else {
    // eslint-disable-next-line no-unused-vars
    return str.replace(/(\\u|u)([0-9a-f]{4})/gi, (match, _u, hex) => {
      // 将十六进制转换为对应的Unicode字符
      return String.fromCharCode(parseInt(hex, 16));
    });
  }
}
