import "server-only";

import { sendVerificationCode } from "@/app/(auth)/auth/verify/lib";
import { verifyUserSwitchToken } from "@/app/team/lib";
import { rootLogger } from "@/lib/logging";
import { User, UserType } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { compare } from "bcryptjs";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { verifyImpersonationLoginToken } from "./impersonationLogin";
import { authLogger, createPersonalUser, recordAndTrackLastLogin } from "./lib";

const authOptions: NextAuthOptions = {
  logger: {
    error(code, metadata) {
      const logger = code === "CLIENT_FETCH_ERROR" ? authLogger.warn : authLogger.error;
      if (metadata instanceof Error) {
        logger({ code, msg: metadata.message });
      } else {
        const { error, ...rest } = metadata;
        logger({
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
          userType: "Personal",
          teamIdAsMember: null,
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
        let targetUser: User | null;
        try {
          targetUser = await prisma.user.findUnique({ where: { id: payload.userId } });
        } catch (error) {
          authLogger.error(`Error fetching user: ${(error as Error).message}`);
          throw new Error("SERVER_ERROR");
        }
        if (!targetUser) {
          throw new Error("USER_NOT_FOUND");
        }

        // 验证目标用户是否有效
        const isPersonalUser = targetUser.email && !targetUser.teamIdAsMember;
        const isTeamUser = targetUser.personalUserId && targetUser.teamIdAsMember;
        const userType: UserType = targetUser.teamIdAsMember ? "TeamMember" : "Personal";

        if (!isPersonalUser && !isTeamUser) {
          throw new Error("INVALID_TARGET_USER");
        }

        // 如果是团队用户，需要验证对应的个人用户email已验证
        if (isTeamUser && targetUser.personalUserId) {
          const personalUser = await prisma.user.findUnique({
            where: { id: targetUser.personalUserId },
          });
          if (!personalUser?.emailVerified) {
            throw new Error("EMAIL_NOT_VERIFIED");
          }
        }

        // 如果是个人用户，直接验证email已验证
        if (isPersonalUser && !targetUser.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        // 获取显示用的email
        let displayEmail = targetUser.email;
        if (!displayEmail && targetUser.personalUserId) {
          const personalUser = await prisma.user.findUnique({
            where: { id: targetUser.personalUserId },
          });
          displayEmail = personalUser?.email || null;
        }

        // 不要 recordLastLogin，因为可能是 admin 登录的
        return {
          id: targetUser.id,
          name: targetUser.name,
          email: displayEmail!,
          userType,
          teamIdAsMember: targetUser.teamIdAsMember,
        };
      },
    }),
    CredentialsProvider({
      id: "team-switch",
      credentials: {
        targetUserId: { label: "Target User ID", type: "text" },
        switchToken: { label: "Switch Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.targetUserId || !credentials?.switchToken) {
          throw new Error("MISSING_CREDENTIALS");
        }

        const targetUserId = parseInt(credentials.targetUserId);
        if (isNaN(targetUserId)) {
          throw new Error("INVALID_USER_ID");
        }

        // 验证切换token（使用与impersonation-login相同的加密算法）
        const switchData = verifyUserSwitchToken(credentials.switchToken);
        if (!switchData) {
          throw new Error("INVALID_SWITCH_TOKEN");
        }

        // 验证targetUserId是否匹配
        if (switchData.targetUserId !== targetUserId) {
          throw new Error("TOKEN_USER_MISMATCH");
        }

        let targetUser: User | null;
        try {
          targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
          });
        } catch (error) {
          authLogger.error(`Error fetching target user: ${(error as Error).message}`);
          throw new Error("SERVER_ERROR");
        }

        if (!targetUser) {
          throw new Error("TARGET_USER_NOT_FOUND");
        }

        // 验证目标用户是否有效
        const isPersonalUser = targetUser.email && !targetUser.teamIdAsMember;
        const isTeamUser = targetUser.personalUserId && targetUser.teamIdAsMember;
        const userType: UserType = targetUser.teamIdAsMember ? "TeamMember" : "Personal";

        if (!isPersonalUser && !isTeamUser) {
          throw new Error("INVALID_TARGET_USER");
        }

        // 如果是团队用户，需要验证对应的个人用户email已验证
        if (isTeamUser && targetUser.personalUserId) {
          const personalUser = await prisma.user.findUnique({
            where: { id: targetUser.personalUserId },
          });
          if (!personalUser?.emailVerified) {
            throw new Error("EMAIL_NOT_VERIFIED");
          }
        }

        // 如果是个人用户，直接验证email已验证
        if (isPersonalUser && !targetUser.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        recordAndTrackLastLogin({ userId: targetUser.id, provider: "team-switch" });
        // 获取显示用的email
        let displayEmail = targetUser.email;
        if (!displayEmail && targetUser.personalUserId) {
          const personalUser = await prisma.user.findUnique({
            where: { id: targetUser.personalUserId },
          });
          displayEmail = personalUser?.email || null;
        }

        return {
          id: targetUser.id,
          name: targetUser.name,
          email: displayEmail!,
          userType,
          teamIdAsMember: targetUser.teamIdAsMember,
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
      const invalidSession = { ...session, user: undefined, userType: undefined, team: undefined };
      const validSession = {
        ...session,
        user: {
          ...session.user,
          id: parseInt(token.id + ""),
        },
      };
      if (token._ut === 0) {
        validSession.userType = "Personal";
      } else if (token._ut === 1) {
        if (!token._tid) {
          return invalidSession;
        }
        validSession.userType = "TeamMember";
        validSession.team = { id: token._tid };
      } else {
        return invalidSession;
      }

      return validSession;
    },
    jwt: ({ token, user }) => {
      if (user) {
        const validToken = {
          ...token,
          id: parseInt(user.id + ""),
        };
        if (user.userType === "Personal") {
          validToken._ut = 0;
        } else if (user.userType === "TeamMember") {
          if (!user.teamIdAsMember) {
            throw new Error("INVALID_TEAM_ID");
          }
          validToken._ut = 1;
          validToken._tid = parseInt(user.teamIdAsMember + "");
        } else {
          throw new Error("INVALID_USER_TYPE");
        }
        return validToken;
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
          const newUser = await createPersonalUser({
            email: user.email,
            emailVerified: new Date(),
          });
          // 更新 session 上的 user.id 为数据库的 id，本来是 google 的用户 id
          user.id = newUser.id;
          // 新用户不需要检查 onboarding，会在后续流程中处理
        } else {
          if (existingUser.teamIdAsMember) {
            throw new Error("TEAM_MEMBER_NOT_ALLOWED");
          }
          // 更新 session 上的 user.id 为数据库的 id，本来是 google 的用户 id
          user.id = existingUser.id;
        }
        user.userType = "Personal";
        user.teamIdAsMember = null;
        recordAndTrackLastLogin({ userId: user.id, provider: "google" });
      }
      return true;
    },
  },
};

export default authOptions;
