import "server-only";

import { sendVerificationCode } from "@/app/auth/verify/actions";
import { getRequestClientIp, getRequestUserAgent } from "@/lib/request/headers";
import { prisma } from "@/prisma/prisma";
import { compare, hash } from "bcryptjs";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { verifyImpersonationLoginToken } from "./impersonationLogin";
import { rootLogger } from "./logging";

export const authClientInfo = async () => {
  const lastLogin = {
    timestamp: Date.now(),
    clientIp: await getRequestClientIp(),
    userAgent: await getRequestUserAgent(),
  };

  return lastLogin;
};

export const authOptions: NextAuthOptions = {
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("INVALID_CREDENTIALS");
        }
        const email = credentials.email.toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }
        const isPasswordValid = await compare(credentials.password, user.password);
        if (!isPasswordValid) {
          throw new Error("INVALID_PASSWORD");
        }
        if (!user.emailVerified) {
          await sendVerificationCode(user.email);
          throw new Error("EMAIL_NOT_VERIFIED");
        }
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
        // Find the user
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
        });
        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }
        // Update user's last login info
        const lastLogin = await authClientInfo();
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin },
        });
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

export async function createUser({
  email,
  password,
  emailVerified,
}: {
  email: string;
  password?: string;
  emailVerified?: Date;
}) {
  email = email.toLowerCase();

  const hashedPassword = password ? await hash(password, 10) : "";
  const lastLogin = await authClientInfo();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...user } = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      lastLogin,
      emailVerified: emailVerified ?? null,
    },
  });

  // 注册赠送 1_000_000 tokens
  const signupAmount = 1_000_000;
  await prisma.$transaction(async (tx) => {
    await tx.userTokensLog.create({
      data: {
        userId: user.id,
        verb: "signup",
        value: signupAmount,
      },
    });
    await tx.userTokens.create({
      data: {
        userId: user.id,
        permanentBalance: signupAmount,
      },
    });
  });

  return user;
}
