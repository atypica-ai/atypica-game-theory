import { authOptions } from "@/lib/auth";
import { rootLogger } from "@/lib/logging";
import NextAuth from "next-auth";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handler(req: NextRequest, context: any) {
  const headersList = await headers();
  rootLogger.info({
    api: "next-auth",
    method: req.method,
    url: req.url,
    referer: headersList.get("referer"),
    userAgent: headersList.get("user-agent"),
  });
  return await NextAuth(req, context, authOptions);
}

// // const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
