import { NextRequest, NextResponse } from "next/server";
import { getRequestClientIp, getRequestOrigin } from "./lib/headers";

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_public|favicon.ico|manifest.json|sitemap.xml|robots.txt).*)",
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

function handleLocale(req: NextRequest) {
  // Get the locale from cookies
  const localeCookie = req.cookies.get("locale");
  const locale = localeCookie?.value || "zh-CN";
  // Create a response object from the request
  const response = NextResponse.next();
  // Set the locale in a header to be accessible in server components
  response.headers.set("x-locale", locale);
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
      const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
      console.log(baseUrl);
      const maintenanceResponse = await fetch(`${baseUrl}/api/system/maintenance-status`);
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

  // Otherwise continue with locale handling
  const response = handleLocale(req);

  return response;
}
