"use server";
import { authOptions } from "@/lib/auth";
import { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Helper function to check authentication
export async function withAuth<T>(
  action: (user: NonNullable<Session["user"]>) => Promise<T>,
): Promise<T> {
  const headersList = await headers();
  const session = await getServerSession(authOptions);
  const referer = headersList.get("referer") || "/";
  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(referer)}`);
  }
  return action(session.user);
}
