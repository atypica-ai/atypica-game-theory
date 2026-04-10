import "server-only";

import { rootLogger } from "@/lib/logging";
import { getRequestClientIp, getRequestGeo, getRequestUserAgent } from "@/lib/request/headers";
import { User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { hash } from "bcryptjs";
import { getLocale } from "next-intl/server";

export const authLogger = rootLogger.child({ api: "next-auth" });

export interface UserLastLogin {
  timestamp: number;
  clientIp: string;
  userAgent?: string;
  geo?: Partial<{
    country: string;
    countryCode: string;
    city: string;
  }>;
  locale?: string;
  provider?: "email-password" | "google";
}

export const authClientInfo = async (): Promise<
  Pick<UserLastLogin, "timestamp" | "clientIp" | "userAgent" | "geo" | "locale">
> => {
  const timestamp = Date.now();
  const [clientIp, userAgent, geo, locale] = await Promise.all([
    getRequestClientIp(),
    getRequestUserAgent(),
    getRequestGeo(),
    getLocale(),
  ]);
  return {
    timestamp,
    clientIp,
    ...(userAgent ? { userAgent } : {}),
    ...(geo ? { geo } : {}),
    ...(locale ? { locale } : {}),
  };
};

async function _recordLastLogin({
  userId,
  provider,
}: {
  userId: number;
  provider?: "email-password" | "google";
}): Promise<UserLastLogin | void> {
  try {
    const clientInfo = await authClientInfo();
    const lastLogin = {
      ...clientInfo,
      provider,
    } satisfies UserLastLogin;

    // Try to update UserProfile if it exists
    try {
      await prisma.userProfile.update({
        where: { userId },
        data: { lastLogin },
      });
    } catch {
      // UserProfile doesn't exist yet, skip
    }

    return lastLogin;
  } catch (error) {
    authLogger.error({ msg: "Error updating user last login", error: (error as Error).message });
  }
}

export function recordAndTrackLastLogin({
  userId,
  provider,
}: {
  userId: number;
  provider: "email-password" | "google";
}) {
  // Run in background, don't await
  _recordLastLogin({ userId, provider }).catch(() => {});
}

export async function createPersonalUser({
  name: providedName,
  email,
  password,
  emailVerified,
}: {
  name?: string;
  email: string;
  password?: string;
  emailVerified?: Date;
}) {
  email = email.toLowerCase();
  const name = providedName?.trim() || email.split("@")[0];
  const hashedPassword = password ? await hash(password, 10) : "";

  const user = await prisma.$transaction(async (tx) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...user } = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: emailVerified ?? null,
      },
    });

    // Try to create UserProfile if the model exists
    try {
      await tx.userProfile.create({
        data: { userId: user.id },
      });
    } catch {
      // UserProfile model doesn't exist yet, skip
    }

    return user;
  });

  // Record last login in background
  _recordLastLogin({ userId: user.id }).catch(() => {});

  return { ...user, email } as Omit<User, "email"> & { email: string };
}

/**
 * Clean authentication callback URL to prevent open redirect attacks
 * @param url - Original callback URL
 * @returns Cleaned relative path (starting with /)
 */
export function cleanAuthCallbackUrl(url: string): string {
  if (!url || !url.trim()) return "/";
  url = url.trim();

  // If contains protocol, parse and extract only path
  if (url.includes("://") || url.startsWith("//")) {
    try {
      const urlToParse = url.startsWith("//") ? `https:${url}` : url;
      const parsed = new URL(urlToParse);
      const cleanPath = parsed.pathname + parsed.search + parsed.hash;
      return cleanPath || "/";
    } catch {
      return "/";
    }
  }

  // Already a relative path, ensure it starts with /
  return url.startsWith("/") ? url : `/${url}`;
}
