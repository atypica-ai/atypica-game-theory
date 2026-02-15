"use server";

import authOptions from "@/app/(auth)/authOptions";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
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
    // 分别查询个人模板和公共模板，确保个人模板优先
    const [personalTemplates, publicTemplates] = await Promise.all([
      // 个人模板
      userId
        ? prisma.researchTemplate.findMany({
            where: { locale, userId },
            orderBy: { createdAt: "desc" },
            take: 12, // 最多取 12 个个人模板
          })
        : Promise.resolve([]),
      // 公共模板
      prisma.researchTemplate.findMany({
        where: { locale, userId: null, teamId: null },
        orderBy: { createdAt: "desc" },
        take: 12, // 最多取 12 个公共模板
      }),
    ]);

    // 合并：个人模板 + 公共模板，限制总数 12 个
    const templates = [...personalTemplates, ...publicTemplates].slice(0, 12);

    // 转换为前端格式，包含 id
    return templates.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      tags: t.extra.tags || [],
    }));
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
 * - 按创建时间倒序排序（最新优先）
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
    rootLogger.error({
      msg: "Failed to load research templates:",
      error: error instanceof Error ? error.message : String(error),
    });
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
 * 使用原子性的 SQL 递增操作，避免并发问题
 *
 * @param templateId - 模板 ID
 */
export async function trackTemplateUsage(templateId: number): Promise<void> {
  try {
    // 使用 raw SQL 原子性地递增 useCount
    await prisma.$executeRaw`
      UPDATE "ResearchTemplate"
      SET extra = jsonb_set(
            COALESCE(extra, '{}'::jsonb),
            '{useCount}',
            to_jsonb(COALESCE((extra->>'useCount')::int, 0) + 1)
          ),
          "updatedAt" = NOW()
      WHERE id = ${templateId}
    `;
  } catch (error) {
    rootLogger.error({
      msg: "Failed to track template usage:",
      error: error instanceof Error ? error.message : String(error),
    });
    // 不抛出错误，避免影响主流程
  }
}
