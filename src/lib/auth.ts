import { sendVerificationEmail } from "@/app/auth/verify/actions";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getRequestClientIp, getRequestUserAgent } from "./headers";

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
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }
        const isPasswordValid = await compare(credentials.password, user.password);
        if (!isPasswordValid) {
          throw new Error("INVALID_PASSWORD");
        }
        if (!user.emailVerified) {
          await sendVerificationEmail(user.email);
          throw new Error("EMAIL_NOT_VERIFIED");
        }
        return {
          id: user.id,
          email: user.email,
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
