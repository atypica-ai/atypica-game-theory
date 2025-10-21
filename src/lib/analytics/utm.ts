export type UtmParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  // 记录首次捕获时间
  capturedAt?: string;
};

export type RefererParams = {
  referer: string; // 完整的 referer URL
  hostname: string; // 提取的域名
  // 记录首次捕获时间
  capturedAt?: string;
};

export const UTM_COOKIE_NAME = "atypica.acquisition.utm";
export const REFERER_COOKIE_NAME = "atypica.acquisition.referer";
export const UTM_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// 需要过滤的内部域名列表（不记录为 referral）
const INTERNAL_DOMAINS = [
  "atypica.ai",
  "musedam.cc",
  "musedam.ai",
  "museai.cc",
  "tezign.com",
  "localhost",
];

/**
 * 检查域名是否为内部域名
 */
function isInternalDomain(hostname: string): boolean {
  // 检查是否是 localhost 或 IP 地址
  if (hostname === "localhost" || hostname.startsWith("127.") || hostname.startsWith("192.168.")) {
    return true;
  }

  // 检查是否匹配内部域名列表（包括子域名）
  return INTERNAL_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

/**
 * 从 URL 搜索参数中提取 UTM 参数
 * 可以在 middleware 和 server actions 中使用
 */
export function extractUtmFromSearchParams(searchParams: URLSearchParams): UtmParams | null {
  const utmParams: UtmParams = {};
  let hasUtm = false;

  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

  for (const key of utmKeys) {
    const value = searchParams.get(key);
    if (value) {
      utmParams[key] = value;
      hasUtm = true;
    }
  }

  if (hasUtm) {
    utmParams.capturedAt = new Date().toISOString();
    return utmParams;
  }

  return null;
}

/**
 * 从 Referer 头部提取来源信息
 */
export function extractRefererFromHeader(referer: string | null): RefererParams | null {
  // 验证 referer 必须存在且以 https:// 或 http:// 开头
  if (!referer || !/^https?:\/\//i.test(referer)) {
    return null;
  }

  try {
    const refererUrl = new URL(referer);
    const hostname = refererUrl.hostname;

    // 过滤掉内部域名
    if (isInternalDomain(hostname)) {
      return null;
    }

    return {
      referer,
      hostname,
      capturedAt: new Date().toISOString(),
    };
  } catch {
    // 如果 referer 不是有效的 URL，返回 null
    return null;
  }
}

/**
 * 从 Request 的 cookie 中读取 UTM 参数（用于 server actions）
 */
export async function getUtmFromCookieStore(): Promise<UtmParams | null> {
  const { cookies: cookiesFn } = await import("next/headers");
  const cookieStore = await cookiesFn();
  const utmCookie = cookieStore.get(UTM_COOKIE_NAME);

  if (!utmCookie?.value) {
    return null;
  }

  try {
    return JSON.parse(utmCookie.value) as UtmParams;
  } catch {
    return null;
  }
}

/**
 * 从 Request 的 cookie 中读取 Referer 参数（用于 server actions）
 */
export async function getRefererFromCookieStore(): Promise<RefererParams | null> {
  const { cookies: cookiesFn } = await import("next/headers");
  const cookieStore = await cookiesFn();
  const refererCookie = cookieStore.get(REFERER_COOKIE_NAME);

  if (!refererCookie?.value) {
    return null;
  }

  try {
    return JSON.parse(refererCookie.value) as RefererParams;
  } catch {
    return null;
  }
}

/**
 * 清除 UTM cookie
 */
export async function clearUtmCookie(): Promise<void> {
  const { cookies: cookiesFn } = await import("next/headers");
  const cookieStore = await cookiesFn();
  cookieStore.delete(UTM_COOKIE_NAME);
}

/**
 * 清除 Referer cookie
 */
export async function clearRefererCookie(): Promise<void> {
  const { cookies: cookiesFn } = await import("next/headers");
  const cookieStore = await cookiesFn();
  cookieStore.delete(REFERER_COOKIE_NAME);
}
