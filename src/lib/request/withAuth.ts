"use server";
import authOptions from "@/app/(auth)/authOptions";
import { rootLogger } from "@/lib/logging";
import { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

async function determineCallbackUrl(): Promise<string> {
  try {
    const headersList = await headers();
    const referer = headersList.get("referer");
    if (!referer) {
      return "/";
    }
    const refererUrl = new URL(referer);
    if (refererUrl.pathname.startsWith("/auth/signin")) {
      return "/";
    }
    const callbackUrlInParams = refererUrl.searchParams.get("callbackUrl");
    if (callbackUrlInParams) {
      return callbackUrlInParams;
    }
    return "/";
  } catch (error) {
    rootLogger.warn({
      msg: "Failed to determine callback URL",
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    return "/";
  }
}

export async function withAuth<T>(
  action: (user: NonNullable<Session["user"]>) => Promise<T>,
): Promise<T> {
  const loginUrl = `/auth/signin?callbackUrl=${encodeURIComponent(await determineCallbackUrl())}`;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(loginUrl);
  }
  return action(session.user);
}
