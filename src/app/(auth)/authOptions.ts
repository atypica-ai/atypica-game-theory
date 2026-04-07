import "server-only";

import { sendVerificationCode } from "@/app/(auth)/auth/verify/lib";
import { User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { compare } from "bcryptjs";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authLogger, recordAndTrackLastLogin } from "./lib";

const authOptions: NextAuthOptions = {
  logger: {
    error(code, metadata) {
      const log = (payload: { code: string; msg?: string }) => {
        if (code === "CLIENT_FETCH_ERROR") {
          authLogger.warn(payload);
          return;
        }
        authLogger.error(payload);
      };
      if (metadata instanceof Error) {
        log({ code, msg: metadata.message });
      } else if (!metadata) {
        log({ code });
      } else {
        const { error, ...rest } = metadata as { error?: Error; [key: string]: unknown };
        log({
          code,
          msg: JSON.stringify({
            ...(error ? { error: error.message } : {}),
            ...rest,
          }),
        });
      }
    },
    warn(code) {
      authLogger.warn({ code });
    },
    debug(code, metadata) {
      authLogger.debug({ code, msg: `${metadata}` });
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: { sameSite: "lax", path: "/", secure: true },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    },
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("INVALID_CREDENTIALS");
        }
        const email = credentials.email.toLowerCase().trim();
        let user: User | null;
        try {
          user = await prisma.user.findUnique({ where: { email } });
        } catch (error) {
          authLogger.error(`Error fetching user: ${(error as Error).message}`);
          throw new Error("SERVER_ERROR");
        }
        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }
        if (user.teamIdAsMember) {
          throw new Error("TEAM_MEMBER_NOT_ALLOWED");
        }
        const isPasswordValid = await compare(credentials.password, user.password);
        if (!isPasswordValid) {
          throw new Error("INVALID_PASSWORD");
        }
        if (!user.emailVerified) {
          try {
            await sendVerificationCode(email);
          } catch {
            // 无法做任何处理，通知了用户也没用，前端直接处理接下来的 EMAIL_NOT_VERIFIED 错误就行，然后去邮箱验证页面
          }
          throw new Error("EMAIL_NOT_VERIFIED");
        }
        recordAndTrackLastLogin({ userId: user.id, provider: "email-password" });
        return {
          id: user.id,
          name: user.name,
          email: user.email!,
        };
      },
    }),
  ],
  callbacks: {
    session: ({ session, token }) => {
      return {
        ...session,
        user: {
          ...session.user,
          id: parseInt(token.id + ""),
        },
      };
    },
    jwt: ({ token, user }) => {
      if (user) {
        return {
          ...token,
          id: parseInt(user.id + ""),
        };
      }
      return token;
    },
  },
};

export default authOptions;
