"use server";
import authOptions from "@/app/(auth)/authOptions";
import { rootLogger } from "@/lib/logging";
import { UserType } from "@/prisma/client";
import { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

async function determineCallbackUrl(): Promise<string> {
  try {
    const headersList = await headers();
    const referer = headersList.get("referer"); // 因为浏览器隐私设置，这个值不一定每次都有
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
    rootLogger.warn("Failed to determine callback URL", error);
    return "/";
  }
}

export async function withAuth<T>(
  action: (
    user: NonNullable<Session["user"]>,
    userType: UserType,
    team: NonNullable<Session["team"]> | null,
  ) => Promise<T>,
): Promise<T> {
  const loginUrl = `/auth/signin?callbackUrl=${encodeURIComponent(await determineCallbackUrl())}`;
  const session = await getServerSession(authOptions);
  if (!session?.user || !session?.userType) {
    redirect(loginUrl);
  }
  if (session.userType === "TeamMember") {
    const team = session.team;
    if (!team) {
      redirect(loginUrl);
    }
    return action(session.user, "TeamMember", team);
  } else if (session.userType === "Personal") {
    return action(session.user, "Personal", null);
  } else {
    redirect(loginUrl);
  }
}
