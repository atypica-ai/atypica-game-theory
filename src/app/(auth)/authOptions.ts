import "server-only";

import { sendVerificationCode } from "@/app/(auth)/auth/verify/lib";
import { User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { compare } from "bcryptjs";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { authLogger, createPersonalUser, recordAndTrackLastLogin } from "./lib";

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
    GoogleProvider({
      clientId: process.env.OAUTH_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.id,
        name: token.name,
      },
    }),
    jwt: async ({ token, user, trigger }) => {
      // Initial sign-in: persist id + name from DB user
      if (user) {
        token.id = parseInt(user.id + "");
        token.name = user.name;
      }
      // Client called update() after name change — refresh from DB
      if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { name: true },
        });
        if (dbUser) token.name = dbUser.name;
      }
      return token;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        if (!user.email) {
          authLogger.error({
            msg: "Google auth: email missing from profile",
            account: JSON.stringify(account),
          });
          throw new Error("EMAIL_NOT_FOUND");
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!(profile as any)?.email_verified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (!existingUser) {
          const newUser = await createPersonalUser({
            name: user.name ?? undefined,
            email: user.email,
            emailVerified: new Date(),
          });
          user.id = newUser.id;
        } else {
          if (existingUser.teamIdAsMember) {
            throw new Error("TEAM_MEMBER_NOT_ALLOWED");
          }
          user.id = existingUser.id;
        }
        recordAndTrackLastLogin({ userId: user.id as number, provider: "google" });
      }
      return true;
    },
  },
};

export default authOptions;
