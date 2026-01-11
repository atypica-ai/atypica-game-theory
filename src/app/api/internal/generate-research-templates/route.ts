import { generatePublicTemplates } from "@/app/(newStudy)/lib/template";
import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { Locale } from "next-intl";
import { NextRequest, NextResponse } from "next/server";

// Internal auth validation helper
function validateInternalAuth(request: NextRequest): boolean {
  const internalSecret = request.headers.get("x-internal-secret");
  return internalSecret === process.env.INTERNAL_API_SECRET;
}

/**
 * Internal API: 生成公共研究模板
 *
 * POST /api/internal/generate-research-templates
 *
 * Body (optional):
 * {
 *   "locale": "zh-CN" | "en-US",  // 默认: zh-CN
 *   "replaceExisting": boolean,   // 是否替换现有模板，默认: false
 *   "dryRun": boolean,            // 测试模式，不实际保存，默认: false
 *   "count": number               // 生成模板数量，默认: 12
 * }
 */
export async function POST(request: NextRequest) {
  const logger = rootLogger.child({ api: "generate-research-templates" });

  // Validate internal authentication
  if (!validateInternalAuth(request)) {
    logger.warn("Unauthorized access to generate research templates API");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const locale = (body.locale as Locale | undefined) || VALID_LOCALES[0];
    const replaceExisting = body.replaceExisting === true;
    const dryRun = body.dryRun === true;
    const count = typeof body.count === "number" && body.count > 0 ? body.count : 12;

    // Validate locale
    if (!VALID_LOCALES.includes(locale)) {
      return NextResponse.json(
        { error: `Invalid locale. Must be one of: ${VALID_LOCALES.join(", ")}` },
        { status: 400 },
      );
    }

    logger.info({
      msg: "Generate research templates request received",
      locale,
      replaceExisting,
      dryRun,
      count,
    });

    // Call business logic from lib
    const result = await generatePublicTemplates(locale, replaceExisting, dryRun, count);

    // DryRun mode: return generated templates without saving
    if (dryRun && typeof result !== "number") {
      logger.info({ msg: "Dry run completed", count: result.count });
      return NextResponse.json({
        success: true,
        locale,
        dryRun: true,
        count: result.count,
        templates: result.templates,
        message: `Dry run: generated ${result.count} templates (not saved)`,
        timestamp: new Date().toISOString(),
      });
    }

    // Normal mode: return count
    const resultCount = typeof result === "number" ? result : result.count;
    return NextResponse.json({
      success: true,
      locale,
      count: resultCount,
      replaceExisting,
      message: `Successfully generated and saved ${resultCount} templates`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      msg: "Failed to generate research templates",
      error: errorMessage,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
