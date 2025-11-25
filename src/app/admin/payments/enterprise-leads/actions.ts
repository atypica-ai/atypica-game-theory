"use server";
import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { thanksTool } from "@/app/(agents)/tools";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { ServerActionResult } from "@/lib/serverAction";
import { User, UserChat } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { InferUITools, UIDataTypes, UIMessage } from "ai";

type T = UIMessage<
  unknown,
  UIDataTypes,
  // { thanks: { input: ThanksToolInput; output: ThanksToolResult } }
  InferUITools<{ thanks: typeof thanksTool }>
>;

// Fetch enterprise leads with pagination
export async function fetchEnterpriseLeads(
  page: number = 1,
  pageSize: number = 10,
): Promise<
  ServerActionResult<
    (UserChat & {
      user: Pick<User, "id" | "email">;
      messages: T[];
    })[]
  >
> {
  await checkAdminAuth([AdminPermission.VIEW_ENTERPRISE_LEADS]);

  const skip = (page - 1) * pageSize;

  const leads = await prisma.userChat.findMany({
    where: {
      OR: [
        { title: { contains: "想了解一下企业版" } },
        { title: { contains: "learn about the enterprise plan" } },
      ],
      kind: "misc",
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
      messages: {
        orderBy: { id: "asc" },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take: pageSize,
  });

  const totalCount = await prisma.userChat.count({
    where: {
      title: {
        contains: "企业用户",
      },
      kind: "misc",
    },
  });

  return {
    success: true,
    data: leads.map((lead) => ({
      ...lead,
      messages: lead.messages.map(convertDBMessageToAIMessage) as T[],
    })),
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}
