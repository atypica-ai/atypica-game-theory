"use server";
import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { CONTINUE_ASSISTANT_STEPS } from "@/ai/messageUtilsClient";
import { initStudyStatReporter } from "@/ai/tools/stats";
import { executeBaseAgentRequest } from "@/app/(study)/agents/baseAgentRequest";
import { createFastInsightAgentConfig } from "@/app/(study)/agents/configs/fastInsightAgentConfig";
import { createProductRnDAgentConfig } from "@/app/(study)/agents/configs/productRnDAgentConfig";
import { createStudyAgentConfig } from "@/app/(study)/agents/configs/studyAgentConfig";
import { checkAdminAuth } from "@/app/admin/actions";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import {
  AnalystKind,
  PaymentRecord,
  TokensAccount,
  User,
  UserChat,
  UserChatExtra,
} from "@/prisma/client";
import { prisma, prismaRO } from "@/prisma/prisma";
import { createUIMessageStream, generateId } from "ai";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";

// Fetch studies that might be having issues (have an active backgroundToken)
export async function fetchIssueStudies(
  page: number = 1,
  pageSize: number = 10,
): Promise<
  ServerActionResult<
    (Omit<UserChat, "messages"> & {
      user: Pick<User, "id" | "email"> & {
        tokensAccount: TokensAccount | null;
        paymentRecords: PaymentRecord[];
      };
    })[]
  >
> {
  // Only Super Admins can access this page
  await checkAdminAuth("SUPER_ADMIN");

  const skip = (page - 1) * pageSize;

  // Find UserChats that have backgroundToken (meaning they're in progress)
  const studies = await prismaRO.userChat.findMany({
    where: {
      kind: "study",
      backgroundToken: {
        not: null,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          tokensAccount: true,
          paymentRecords: {
            where: {
              status: "succeeded",
            },
          },
        },
      },
    },
    orderBy: [
      { backgroundToken: "desc" }, // Show newest first
    ],
    skip,
    take: pageSize,
  });

  const totalCount = await prismaRO.userChat.count({
    where: {
      kind: "study",
      backgroundToken: {
        not: null,
      },
    },
  });

  return {
    success: true,
    data: studies,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// Fetch studies with errors in the last 14 days
export async function fetchErrorStudies(
  page: number = 1,
  pageSize: number = 10,
): Promise<
  ServerActionResult<
    (Omit<UserChat, "messages"> & {
      user: Pick<User, "id" | "email"> & {
        tokensAccount: TokensAccount | null;
        paymentRecords: PaymentRecord[];
      };
      errorMessage: string;
    })[]
  >
> {
  // Only Super Admins can access this page
  await checkAdminAuth("SUPER_ADMIN");

  const skip = (page - 1) * pageSize;
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // Find UserChats that have extra.error in the last 14 days
  const studies = await prismaRO.$queryRaw<
    (UserChat & {
      user: Pick<User, "id" | "email"> & {
        tokensAccount: TokensAccount | null;
        paymentRecords: PaymentRecord[];
      };
    })[]
  >`
    SELECT
      uc.*,
      json_build_object(
        'id', u.id,
        'email', u.email,
        'tokensAccount', ut.*,
        'paymentRecords', COALESCE(
          json_agg(
            json_build_object(
              'id', pr.id,
              'amount', pr.amount,
              'currency', pr.currency,
              'status', pr.status,
              'paidAt', pr."paidAt"
            )
          ) FILTER (WHERE pr.id IS NOT NULL), '[]'::json
        )
      ) as user
    FROM "UserChat" uc
    JOIN "User" u ON uc."userId" = u.id
    LEFT JOIN "TokensAccount" ut ON u.id = ut."userId"
    LEFT JOIN "PaymentRecord" pr ON u.id = pr."userId" AND pr.status = 'succeeded'
    WHERE uc.kind = 'study'
      AND uc.extra ? 'error'
      AND uc.extra->>'error' IS NOT NULL
      AND uc.extra->>'error' != ''
      AND uc."updatedAt" >= ${fourteenDaysAgo}
    GROUP BY uc.id, u.id, ut.id
    ORDER BY uc."updatedAt" DESC
    LIMIT ${pageSize} OFFSET ${skip}
  `;

  const totalCount = await prismaRO.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::int as count
    FROM "UserChat" uc
    WHERE uc.kind = 'study'
      AND uc.extra ? 'error'
      AND uc.extra->>'error' IS NOT NULL
      AND uc.extra->>'error' != ''
      AND uc."updatedAt" >= ${fourteenDaysAgo}
  `;

  const studiesWithError = studies.map((study) => ({
    ...study,
    errorMessage: (study.extra as UserChatExtra)?.error || "",
  }));

  return {
    success: true,
    data: studiesWithError,
    pagination: {
      page,
      pageSize,
      totalCount: Number(totalCount[0].count),
      totalPages: Math.ceil(Number(totalCount[0].count) / pageSize),
    },
  };
}

// Retry a stuck study
export async function retryStudy(studyUserChatId: number): Promise<ServerActionResult<void>> {
  // Only Super Admins can perform this action
  await checkAdminAuth("SUPER_ADMIN");

  try {
    // Get the study details
    const studyUserChat = await prisma.userChat.findUnique({
      where: { id: studyUserChatId },
      include: {
        user: true,
        analyst: true,
      },
    });

    if (!studyUserChat) {
      return {
        success: false,
        message: "Study not found",
      };
    }
    if (!studyUserChat.analyst) {
      return {
        success: false,
        message: `UserChat ${studyUserChat.id} does not have an analyst`,
      };
    }

    await persistentAIMessageToDB({
      mode: "append",
      userChatId: studyUserChatId,
      message: {
        id: generateId(),
        role: "user",
        parts: [{ type: "text", text: CONTINUE_ASSISTANT_STEPS }],
      },
    });

    // Clear the backgroundToken to allow a new study to start
    await prisma.userChat.update({
      where: { id: studyUserChatId },
      data: { backgroundToken: null },
    });

    const locale: Locale =
      studyUserChat.analyst.locale === "zh-CN"
        ? "zh-CN"
        : studyUserChat.analyst.locale === "en-US"
          ? "en-US"
          : await getLocale();

    // Start the study agent request in the background
    const userId = studyUserChat.userId;
    const teamId = studyUserChat.user.teamIdAsMember ?? null;
    const logger = rootLogger.child({ studyUserChatId, studyUserChatToken: studyUserChat.token });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const stream = createUIMessageStream({
      async execute({ writer: streamWriter }) {
        if (!studyUserChat.analyst) throw new Error("Something went wrong");

        // Initialize statistics reporter
        const { statReport } = initStudyStatReporter({
          userId,
          studyUserChatId,
          logger,
        });

        // Create abort controllers - must be created here to ensure the same instances
        // are shared between config creation (for tools) and baseAgentRequest (for abort logic)
        const toolAbortController = new AbortController();
        const studyAbortController = new AbortController();

        const agentContext = {
          userId,
          teamId,
          studyUserChatId,
          analyst: studyUserChat.analyst,
          userChatContext: studyUserChat.context,
          locale,
          logger,
          statReport,
          toolAbortController,
          studyAbortController,
        };

        if (studyUserChat.analyst.kind === AnalystKind.productRnD) {
          const config = await createProductRnDAgentConfig({ ...agentContext });
          await executeBaseAgentRequest({ ...agentContext }, config, streamWriter);
        } else if (studyUserChat.analyst.kind === AnalystKind.fastInsight) {
          const config = await createFastInsightAgentConfig({ ...agentContext });
          await executeBaseAgentRequest({ ...agentContext }, config, streamWriter);
        } else {
          const config = await createStudyAgentConfig({ ...agentContext });
          await executeBaseAgentRequest({ ...agentContext }, config, streamWriter);
        }
      },
    });

    revalidatePath("/admin/studies/issues");

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("Error retrying study:", error);
    return {
      success: false,
      message: (error as Error).message,
    };
  }
}
