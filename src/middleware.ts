import {
  extractRefererFromHeader,
  extractUtmFromSearchParams,
  REFERER_COOKIE_NAME,
  UTM_COOKIE_MAX_AGE,
  UTM_COOKIE_NAME,
} from "@/lib/analytics/utm";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { getRequestClientIp, getRequestOrigin } from "@/lib/request/headers";
import { Locale } from "next-intl";
import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_public|_pages|favicon.ico|manifest.json|sitemap.xml|robots.txt|llm.txt).*)",
  ],
};

async function handlePingRequest(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const clientIp = await getRequestClientIp();
  const requestOrigin = await getRequestOrigin();
  const headers = Object.fromEntries(req.headers);
  return new NextResponse(
    JSON.stringify({
      path,
      clientIp,
      requestOrigin,
      headers,
      nextUrl: req.nextUrl,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

function handleLocale(req: NextRequest, response: NextResponse) {
  // Get the locale from cookies
  const localeCookie = req.cookies.get("locale");
  const defaultLocale = getDeployRegion() === "mainland" ? "zh-CN" : "en-US";
  const locale = (localeCookie?.value || defaultLocale) as Locale;
  // Set the locale in a header to be accessible in server components
  response.headers.set("x-locale", locale);
  return locale;
}

function handleAcquisitionTracking(req: NextRequest, response: NextResponse) {
  // 1. 检查 URL 中是否有 UTM 参数
  const utmParams = extractUtmFromSearchParams(req.nextUrl.searchParams);
  if (utmParams) {
    // 如果有 UTM 参数，保存到 cookie（只在没有现有 UTM cookie 时保存）
    const existingUtmCookie = req.cookies.get(UTM_COOKIE_NAME);
    if (!existingUtmCookie) {
      response.cookies.set(UTM_COOKIE_NAME, JSON.stringify(utmParams), {
        maxAge: UTM_COOKIE_MAX_AGE,
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    }
  }

  // 2. 如果没有 UTM 参数，检查 Referer 作为后备方案
  if (!utmParams) {
    const referer = req.headers.get("referer");
    const refererParams = extractRefererFromHeader(referer);

    if (refererParams) {
      // 如果有外部 referer，保存到 cookie（只在没有现有 referer cookie 时保存）
      const existingRefererCookie = req.cookies.get(REFERER_COOKIE_NAME);
      if (!existingRefererCookie) {
        response.cookies.set(REFERER_COOKIE_NAME, JSON.stringify(refererParams), {
          maxAge: UTM_COOKIE_MAX_AGE,
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
      }
    }
  }

  return response;
}

// Cache for maintenance status
let maintenanceCache = {
  isInMaintenance: false,
  lastChecked: 0,
};
// Cache duration in milliseconds (1 minute)
const MAINTENANCE_CACHE_DURATION = 60 * 1000;
async function handleMaintenanceMode(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Skip maintenance check for admin routes, maintenance page itself, and the maintenance status API
  if (path.startsWith("/admin") || path === "/maintenance") {
    return NextResponse.next();
  }

  const currentTime = Date.now();

  // Check if we need to refresh the cache
  if (currentTime - maintenanceCache.lastChecked > MAINTENANCE_CACHE_DURATION) {
    try {
      const origin = await getRequestOrigin();
      const maintenanceResponse = await fetch(`${origin}/api/system/maintenance-status`);
      if (maintenanceResponse.ok) {
        const maintenanceData = await maintenanceResponse.json();
        maintenanceCache = {
          isInMaintenance: maintenanceData.isInMaintenance,
          lastChecked: currentTime,
        };
      }
    } catch (error) {
      console.error("Failed to check maintenance status:", error);
      // If there's an error fetching, we'll use the cached value
      // Just update the last checked time to prevent constant retries
      maintenanceCache.lastChecked = currentTime;
    }
  }

  // Use cached maintenance status to determine if we should redirect
  if (maintenanceCache.isInMaintenance) {
    const url = req.nextUrl.clone();
    url.pathname = "/maintenance";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.endsWith(".ping")) {
    return await handlePingRequest(req);
  }

  const maintenanceResponse = await handleMaintenanceMode(req);
  // If we need to redirect to maintenance page, do that
  if (maintenanceResponse.status === 307) {
    return maintenanceResponse;
  }

  // Create a response object from the request
  const response = NextResponse.next();

  // Handle locale
  const locale = handleLocale(req, response);

  // Handle acquisition tracking (UTM and Referer)
  handleAcquisitionTracking(req, response);

  // Set security headers dynamically at runtime
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set(
    "Content-Security-Policy",
    `frame-ancestors ${process.env.IFRAME_ALLOWED_ORIGINS || "'self'"}`,
  );

  // Handle locale-aware static pages
  const path = req.nextUrl.pathname;
  if (path === "/about.html" || path === "/persona-simulation" || path === "/changelog.html") {
    const url = req.nextUrl.clone();
    if (path === "/about.html") {
      url.pathname = locale === "zh-CN" ? "/_pages/about-zh.html" : "/_pages/about-en.html";
    } else if (path === "/persona-simulation") {
      url.pathname =
        locale === "zh-CN"
          ? "/_pages/persona-simulation-zh.html"
          : "/_pages/persona-simulation-en.html";
    } else if (path === "/changelog.html") {
      url.pathname = locale === "zh-CN" ? "/_pages/changelog-zh.html" : "/_pages/changelog-en.html";
    }
    return NextResponse.rewrite(url);
  }

  return response;
}
