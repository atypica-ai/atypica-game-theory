import { getDeployRegion } from "@/lib/request/deployRegion";
import { getRequestClientIp, getRequestOrigin } from "@/lib/request/headers";
import { Locale } from "next-intl";
import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    "/((?!api|mcp|auth|cdn/proxy-image|cdn/proxy-object|_next/static|_next/image|_public|_pages|favicon.ico|manifest.json|sitemap.xml|robots.txt|llm.txt).*)",
  ],
};

async function handlePingRequest(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const clientIp = await getRequestClientIp();
  const requestOrigin = await getRequestOrigin();
  const headers = Object.fromEntries(req.headers);
  return new NextResponse(
    JSON.stringify({ path, clientIp, requestOrigin, headers, nextUrl: req.nextUrl }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function handleLocale(req: NextRequest, response: NextResponse) {
  const localeCookie = req.cookies.get("locale");
  const defaultLocale = getDeployRegion() === "mainland" ? "zh-CN" : "en-US";
  const locale = (localeCookie?.value || defaultLocale) as Locale;
  response.headers.set("x-locale", locale);
  return locale;
}

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.endsWith(".ping")) {
    return await handlePingRequest(req);
  }

  const response = NextResponse.next();

  handleLocale(req, response);

  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set(
    "Content-Security-Policy",
    `frame-ancestors ${process.env.IFRAME_ALLOWED_ORIGINS || "'self'"}`,
  );

  return response;
}
