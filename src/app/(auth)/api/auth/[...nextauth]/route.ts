import authOptions from "@/app/(auth)/authOptions";
import { authLogger } from "@/app/(auth)/lib";
import {
  getRequestClientIp,
  getRequestGeo,
  getRequestOrigin,
  getRequestUserAgent,
} from "@/lib/request/headers";
import NextAuth from "next-auth";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handler(req: NextRequest, context: any) {
  const [origin, userAgent, clientIp, geo] = await Promise.all([
    getRequestOrigin(),
    getRequestUserAgent(),
    getRequestClientIp(),
    getRequestGeo(),
  ]);
  const headersList = await headers();
  const referer = headersList.get("referer");
  authLogger.debug({
    method: req.method,
    pathname: req.nextUrl.pathname,
    referer,
    origin,
    userAgent,
    clientIp,
    geo,
  });
  return await NextAuth(req, context, authOptions);
}

// // const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
