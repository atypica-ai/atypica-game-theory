export type ToltParams = {
  via: string; // referral code from ?via=xxx
  capturedAt?: string; // 记录首次捕获时间
};

export const TOLT_COOKIE_NAME = "atypica.acquisition.tolt";
export const TOLT_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * 从 URL 搜索参数中提取 Tolt referral 参数
 * 可以在 middleware 和 server actions 中使用
 */
export function extractToltFromSearchParams(searchParams: URLSearchParams): ToltParams | null {
  const via = searchParams.get("via");

  if (via) {
    return {
      via,
      capturedAt: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * 从 Request 的 cookie 中读取 Tolt 参数（用于 server actions）
 */
export async function getToltFromCookieStore(): Promise<ToltParams | null> {
  const { cookies: cookiesFn } = await import("next/headers");
  const cookieStore = await cookiesFn();
  const toltCookie = cookieStore.get(TOLT_COOKIE_NAME);

  if (!toltCookie?.value) {
    return null;
  }

  try {
    return JSON.parse(toltCookie.value) as ToltParams;
  } catch {
    return null;
  }
}

/**
 * 清除 Tolt cookie
 */
export async function clearToltCookie(): Promise<void> {
  const { cookies: cookiesFn } = await import("next/headers");
  const cookieStore = await cookiesFn();
  cookieStore.delete(TOLT_COOKIE_NAME);
}
