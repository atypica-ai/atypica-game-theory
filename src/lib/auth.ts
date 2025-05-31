import "server-only";

import { sendVerificationCode } from "@/app/auth/verify/actions";
import { getRequestClientIp, getRequestUserAgent } from "@/lib/request/headers";
import { prisma } from "@/prisma/prisma";
import { compare, hash } from "bcryptjs";
import { HttpsProxyAgent } from "https-proxy-agent";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import https from "node:https";
import { rootLogger } from "./logging";

const originRequest = https.request;
if (process.env.FETCH_HTTPS_PROXY) {
  const httpsProxyAgent = new HttpsProxyAgent(process.env.FETCH_HTTPS_PROXY);
  // https.globalAgent = httpsProxyAgent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  https.request = function (...args: any) {
    try {
      let options = null;
      let url = null;
      if (typeof args[0] === "string") {
        [url, options] = args;
      }
      if (typeof args[0] === "object") {
        url = args[0].href;
        options = args[0];
      }
      rootLogger.warn({
        msg: "Overriding https.request",
        url,
        userAgent: options?.headers?.["User-Agent"],
      });
      if (
        /accounts\.google\.com|oauth2\.googleapis\.com|www\.googleapis\.com/.test(url) &&
        /openid-client/.test(options?.headers?.["User-Agent"]) &&
        !options.agent
      ) {
        options.agent = httpsProxyAgent;
      }
    } catch (error) {
      rootLogger.error(`Error in https.request: ${(error as Error).message}`);
    }
    return originRequest.apply(https, args);
  };
}

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
  providers: [
    CredentialsProvider({
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

  await prisma.$transaction([
    prisma.userTokensLog.create({
      data: {
        userId: user.id,
        verb: "signup",
        value: 1_500_000,
      },
    }),
    prisma.userTokens.create({
      data: { userId: user.id, balance: 1_500_000 }, // 注册赠送 1_500_000 tokens
    }),
  ]);

  return user;
}
