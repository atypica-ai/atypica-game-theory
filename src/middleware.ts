import { NextRequest, NextResponse } from "next/server";
import { getRequestClientIp, getRequestOrigin } from "./lib/headers";

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|_public|favicon.ico|sitemap.xml|robots.txt).*)"],
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

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.endsWith(".ping")) {
    return await handlePingRequest(req);
  }

  const response = handleLocale(req);

  return response;
}
