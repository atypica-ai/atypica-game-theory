import "server-only";

import { sendVerificationCode } from "@/app/(auth)/auth/verify/lib";
import { rootLogger } from "@/lib/logging";
import { User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { compare } from "bcryptjs";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { verifyImpersonationLoginToken } from "./impersonationLogin";
import { authLogger, createUser, recordLastLogin } from "./lib";

const authOptions: NextAuthOptions = {
  logger: {
    error(code, metadata) {
      if (metadata instanceof Error) {
        authLogger.error({ code, msg: metadata.message });
      } else {
        const { error, ...rest } = metadata;
        authLogger.error({
          code,
          msg: JSON.stringify({
            error: error.message,
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
  // debug: true,
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: { httpOnly: true, sameSite: "none", path: "/", secure: true },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: { sameSite: "none", path: "/", secure: true },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: { httpOnly: true, sameSite: "none", path: "/", secure: true },
    },
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      /**
       * 前端需要调用 signin/actions.ts 里的 signInWithEmail 方法不要直接调用 next-auth/react 自带的 signIn
       * signInWithEmail 可以更好的处理错误，并且在 EMAIL_NOT_VERIFIED 的时候跳转
       */
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
        recordLastLogin(user.id);
        return {
          id: user.id,
          email: user.email,
        };
      },
    }),
    CredentialsProvider({
      id: "impersonation-login",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.token) {
          throw new Error("TOKEN_REQUIRED");
        }
        // Verify the impersonation login token
        const payload = verifyImpersonationLoginToken(credentials.token);
        if (!payload) {
          throw new Error("INVALID_TOKEN");
        }
        let user: User | null;
        try {
          user = await prisma.user.findUnique({ where: { id: payload.userId } });
        } catch (error) {
          authLogger.error(`Error fetching user: ${(error as Error).message}`);
          throw new Error("SERVER_ERROR");
        }
        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }
        // 不要 recordLastLogin，因为可能是 admin 登录的
        return {
          id: user.id,
          email: user.email,
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
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        if (!user.email) {
          rootLogger.error(
            `Google authentication successful, but user email is missing from profile: ${JSON.stringify(account)}`,
          );
          throw new Error("EMAIL_NOT_FOUND");
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!(profile as any).email_verified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });
        if (!existingUser) {
          const newUser = await createUser({
            email: user.email,
            emailVerified: new Date(),
          });
          // 更新 session 上的 user.id 为数据库的 id，本来是 google 的用户 id
          user.id = newUser.id;
        } else {
          // 更新 session 上的 user.id 为数据库的 id，本来是 google 的用户 id
          user.id = existingUser.id;
        }
      }
      return true;
    },
  },
};

export default authOptions;
