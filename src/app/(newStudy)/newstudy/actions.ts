"use server";

import authOptions from "@/app/(auth)/authOptions";
import { ServerActionResult } from "@/lib/serverAction";
import { ResearchTemplateExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth/next";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { unstable_cache } from "next/cache";
import { StudyShortcut } from "./config/shortcuts";

/**
 * 缓存的模板查询函数
 *
 * 缓存策略：
 * - 每个 (locale, userId) 组合有独立的缓存
 * - 未登录用户共享公共模板缓存
 * - 缓存时间：1小时 (3600秒)
 */
const getCachedTemplates = unstable_cache(
  async (locale: Locale, userId: number | undefined) => {
    const templates = await prisma.researchTemplate.findMany({
      where: {
        locale,
        OR: [
          // 公共模板
          { userId: null, teamId: null },
          // 个人模板
          ...(userId ? [{ userId }] : []),
        ],
      },
    });

    // 按使用次数排序（个人模板优先）
    const sorted = templates
      .sort((a, b) => {
        // 个人模板优先
        if (a.userId && !b.userId) return -1;
        if (!a.userId && b.userId) return 1;

        // 同类型按 useCount 排序
        const aExtra = a.extra as ResearchTemplateExtra;
        const bExtra = b.extra as ResearchTemplateExtra;
        const aUseCount = aExtra.useCount || 0;
        const bUseCount = bExtra.useCount || 0;
        return bUseCount - aUseCount;
      })
      .slice(0, 12);

    // 转换为前端格式，包含 id
    return sorted.map((t) => {
      const extra = t.extra as ResearchTemplateExtra;
      return {
        id: t.id,
        title: t.title,
        description: t.description,
        tags: extra.tags || [],
        category: extra.category || "market-analysis",
      };
    });
  },
  ["research-templates"],
  {
    revalidate: 3600, // 1 hour
    tags: ["research-templates"],
  },
);

/**
 * 获取研究模板（公共 + 个人）
 *
 * 展示逻辑：
 * - 个人模板优先展示
 * - 公共模板补足到 12 个
 * - 按使用次数排序
 * - 缓存 1 小时
 *
 * @returns 研究模板列表（包含 id）
 */
export async function getResearchTemplates(): Promise<
  ServerActionResult<Array<StudyShortcut & { id: number }>>
> {
  try {
    // 自动获取 locale 和 session
    const locale = (await getLocale()) as Locale;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const shortcuts = await getCachedTemplates(locale, userId);

    return { success: true, data: shortcuts };
  } catch (error) {
    console.error("Failed to load templates:", error);
    return {
      success: false,
      message: "Failed to load research templates",
      code: "internal_server_error",
    };
  }
}

/**
 * 记录模板使用统计
 *
 * 当用户基于模板发起研究时调用
 *
 * @param templateId - 模板 ID
 */
export async function trackTemplateUsage(templateId: number): Promise<void> {
  try {
    const template = await prisma.researchTemplate.findUnique({
      where: { id: templateId },
    });

    if (template) {
      const extra = template.extra as ResearchTemplateExtra;
      await prisma.researchTemplate.update({
        where: { id: templateId },
        data: {
          extra: {
            ...extra,
            useCount: (extra.useCount || 0) + 1,
          },
        },
      });
    }
  } catch (error) {
    console.error("Failed to track template usage:", error);
    // 不抛出错误，避免影响主流程
  }
}
