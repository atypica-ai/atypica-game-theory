import { GoogleAnalyticsReporter } from "@/lib/analytics/google/reporter.js";
import { loadEnvConfig } from "@next/env";

// 计算字符串的显示宽度（中文字符占2个宽度）
function getDisplayWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    // 中文字符和全角字符占2个宽度
    if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(char)) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

// 正确对齐字符串（考虑中文字符宽度）
function padEndWithWidth(str: string, targetWidth: number): string {
  const currentWidth = getDisplayWidth(str);
  const padding = Math.max(0, targetWidth - currentWidth);
  return str + " ".repeat(padding);
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    command: null as string | null,
    token: null as string | null,
    days: 30, // 默认30天
    limit: 100, // 默认100条
    region: "all" as "all" | "mainland" | "global", // 默认全部地区
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--days") {
      const daysValue = args[i + 1];
      if (daysValue && !isNaN(Number(daysValue))) {
        result.days = parseInt(daysValue);
        i++; // 跳过下一个参数
      } else {
        throw new Error("--days 参数需要一个数字值");
      }
    } else if (arg === "-n" || arg === "--limit") {
      const limitValue = args[i + 1];
      if (limitValue && !isNaN(Number(limitValue))) {
        result.limit = parseInt(limitValue);
        i++; // 跳过下一个参数
      } else {
        throw new Error("-n/--limit 参数需要一个数字值");
      }
    } else if (arg === "--region") {
      const regionValue = args[i + 1];
      if (regionValue && ["all", "mainland", "global"].includes(regionValue)) {
        result.region = regionValue as "all" | "mainland" | "global";
        i++; // 跳过下一个参数
      } else {
        throw new Error("--region 参数值必须是 all, mainland 或 global");
      }
    } else if (!result.command) {
      result.command = arg;
    } else if (!result.token) {
      result.token = arg;
    }
  }

  return result;
}

// 获取日期范围
function getDateRange(days: number) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  return {
    startDate: startDate.toISOString().split("T")[0], // YYYY-MM-DD 格式
    endDate: endDate.toISOString().split("T")[0],
  };
}

// 主函数
async function main() {
  loadEnvConfig(process.cwd());

  const reporter = new GoogleAnalyticsReporter();

  // 解析命令行参数
  const { command: firstArg, token: secondArg, days, limit, region } = parseArgs();
  const { startDate, endDate } = getDateRange(days);

  // 地域过滤说明
  const regionLabel =
    region === "mainland"
      ? " (大陆+香港+台湾)"
      : region === "global"
        ? " (全球-排除大陆/香港/台湾)"
        : "";

  // 判断查询类型: study, report, 或者批量查询
  if (firstArg === "study" && secondArg) {
    // 查询特定 study token 的数据
    console.log(`🔍 正在获取 /study/${secondArg}/share 页面的浏览数据...\n`);

    const report = await reporter.getStudySharePageViews(secondArg, startDate, endDate);

    if (report) {
      console.log(`📊 Study Share 页面统计 (最近${days}天):`);
      console.log("─".repeat(60));
      console.log(`页面路径: ${report.pagePath}`);
      console.log(`浏览量: ${report.pageViews.toLocaleString()}`);
      console.log(`会话数: ${report.sessions.toLocaleString()}`);
      console.log(`用户数: ${report.users.toLocaleString()}`);
      console.log("─".repeat(60));
      console.log(
        `\n✅ /study/${secondArg}/share 页面总浏览量: ${report.pageViews.toLocaleString()}`,
      );
    } else {
      console.log(`❌ 未找到 /study/${secondArg}/share 页面的访问数据`);
      console.log("可能的原因:");
      console.log("  - 页面从未被访问过");
      console.log("  - study token 不正确");
      console.log("  - 指定时间范围内无访问记录");
    }
  } else if (firstArg === "report" && secondArg) {
    // 查询特定 report token 的数据
    console.log(`🔍 正在获取 /artifacts/report/${secondArg}/share 页面的浏览数据...\n`);

    const report = await reporter.getReportSharePageViews(secondArg, startDate, endDate);

    if (report) {
      console.log(`📊 Report Share 页面统计 (最近${days}天):`);
      console.log("─".repeat(60));
      console.log(`页面路径: ${report.pagePath}`);
      console.log(`浏览量: ${report.pageViews.toLocaleString()}`);
      console.log(`会话数: ${report.sessions.toLocaleString()}`);
      console.log(`用户数: ${report.users.toLocaleString()}`);
      console.log("─".repeat(60));
      console.log(
        `\n✅ /artifacts/report/${secondArg}/share 页面总浏览量: ${report.pageViews.toLocaleString()}`,
      );
    } else {
      console.log(`❌ 未找到 /artifacts/report/${secondArg}/share 页面的访问数据`);
      console.log("可能的原因:");
      console.log("  - 页面从未被访问过");
      console.log("  - report token 不正确");
      console.log("  - 指定时间范围内无访问记录");
    }
  } else if (firstArg === "reports") {
    // 查询所有 report share 页面的数据
    console.log(`🔍 正在获取 /artifacts/report/*/share 页面的浏览数据${regionLabel}...\n`);

    const reports = await reporter.getReportSharePagesViews(startDate, endDate, limit, region);

    console.log(`📄 /artifacts/report/*/share 页面详细数据${regionLabel}:`);
    console.log("─".repeat(80));
    console.log(
      padEndWithWidth("页面路径", 50) +
        padEndWithWidth("浏览量", 10) +
        padEndWithWidth("会话数", 10) +
        "用户数",
    );
    console.log("─".repeat(80));

    let totalReportPageViews = 0;
    let totalReportSessions = 0;
    let totalReportUsers = 0;

    for (const report of reports) {
      console.log(
        padEndWithWidth(report.pagePath, 50) +
          padEndWithWidth(report.pageViews.toString(), 10) +
          padEndWithWidth(report.sessions.toString(), 10) +
          report.users.toString(),
      );

      totalReportPageViews += report.pageViews;
      totalReportSessions += report.sessions;
      totalReportUsers += report.users;
    }

    console.log("─".repeat(80));
    console.log(
      padEndWithWidth("Report页面合计", 50) +
        padEndWithWidth(totalReportPageViews.toString(), 10) +
        padEndWithWidth(totalReportSessions.toString(), 10) +
        totalReportUsers.toString(),
    );
    console.log("─".repeat(80));

    console.log(`\n✅ 找到 ${reports.length} 个 /artifacts/report/*/share 页面`);
    console.log(`📈 Report页面总浏览量: ${totalReportPageViews.toLocaleString()}`);
  } else if (firstArg === "studies") {
    // 查询所有 study share 页面的数据
    console.log(`🔍 正在获取 /study/*/share/ 页面的浏览数据${regionLabel}...\n`);

    // 获取指定天数的数据
    const reports = await reporter.getSharePagesViews(["study"], startDate, endDate, limit, region);

    console.log(`📄 /study/*/share/ 页面详细数据${regionLabel}:`);
    console.log("─".repeat(100));
    console.log(
      padEndWithWidth("页面路径", 40) +
        padEndWithWidth("Host", 20) +
        padEndWithWidth("浏览量", 10) +
        padEndWithWidth("会话数", 10) +
        "用户数",
    );
    console.log("─".repeat(100));

    let totalSharePageViews = 0;
    let totalShareSessions = 0;
    let totalShareUsers = 0;

    for (const report of reports) {
      console.log(
        padEndWithWidth(report.pagePath, 40) +
          padEndWithWidth(report.hostName || "N/A", 20) +
          padEndWithWidth(report.pageViews.toString(), 10) +
          padEndWithWidth(report.sessions.toString(), 10) +
          report.users.toString(),
      );

      totalSharePageViews += report.pageViews;
      totalShareSessions += report.sessions;
      totalShareUsers += report.users;
    }

    console.log("─".repeat(100));
    console.log(
      padEndWithWidth("Study页面合计", 60) +
        padEndWithWidth(totalSharePageViews.toString(), 10) +
        padEndWithWidth(totalShareSessions.toString(), 10) +
        totalShareUsers.toString(),
    );
    console.log("─".repeat(100));

    console.log(`\n✅ 找到 ${reports.length} 个 /study/*/share/ 页面`);
    console.log(`📈 Study页面总浏览量: ${totalSharePageViews.toLocaleString()}`);
  } else if (firstArg === "podcasts") {
    // 查询所有 podcast share 页面的数据
    console.log(`🔍 正在获取 /artifacts/podcast/*/share 页面的浏览数据${regionLabel}...\n`);

    const reports = await reporter.getPodcastSharePagesViews(startDate, endDate, limit, region);

    console.log(`📄 /artifacts/podcast/*/share 页面详细数据${regionLabel}:`);
    console.log("─".repeat(80));
    console.log(
      padEndWithWidth("页面路径", 50) +
        padEndWithWidth("浏览量", 10) +
        padEndWithWidth("会话数", 10) +
        "用户数",
    );
    console.log("─".repeat(80));

    let totalPodcastPageViews = 0;
    let totalPodcastSessions = 0;
    let totalPodcastUsers = 0;

    for (const report of reports) {
      console.log(
        padEndWithWidth(report.pagePath, 50) +
          padEndWithWidth(report.pageViews.toString(), 10) +
          padEndWithWidth(report.sessions.toString(), 10) +
          report.users.toString(),
      );

      totalPodcastPageViews += report.pageViews;
      totalPodcastSessions += report.sessions;
      totalPodcastUsers += report.users;
    }

    console.log("─".repeat(80));
    console.log(
      padEndWithWidth("Podcast页面合计", 50) +
        padEndWithWidth(totalPodcastPageViews.toString(), 10) +
        padEndWithWidth(totalPodcastSessions.toString(), 10) +
        totalPodcastUsers.toString(),
    );
    console.log("─".repeat(80));

    console.log(`\n✅ 找到 ${reports.length} 个 /artifacts/podcast/*/share 页面`);
    console.log(`📈 Podcast页面总浏览量: ${totalPodcastPageViews.toLocaleString()}`);
  } else if (firstArg === "podcast" && secondArg) {
    // 查询特定 podcast token 的数据
    console.log(`🔍 正在获取 /artifacts/podcast/${secondArg}/share 页面的浏览数据...\n`);

    const report = await reporter.getPodcastSharePageViews(secondArg, startDate, endDate);

    if (report) {
      console.log(`📊 Podcast Share 页面统计 (最近${days}天):`);
      console.log("─".repeat(60));
      console.log(`页面路径: ${report.pagePath}`);
      console.log(`浏览量: ${report.pageViews.toLocaleString()}`);
      console.log(`会话数: ${report.sessions.toLocaleString()}`);
      console.log(`用户数: ${report.users.toLocaleString()}`);
      console.log("─".repeat(60));
      console.log(
        `\n✅ /artifacts/podcast/${secondArg}/share 页面总浏览量: ${report.pageViews.toLocaleString()}`,
      );
    } else {
      console.log(`❌ 未找到 /artifacts/podcast/${secondArg}/share 页面的访问数据`);
      console.log("可能的原因:");
      console.log("  - 页面从未被访问过");
      console.log("  - podcast token 不正确");
      console.log("  - 指定时间范围内无访问记录");
    }
  } else if (firstArg === "all") {
    // 查询所有类型的 share 页面数据
    console.log(`🔍 正在获取所有 share 页面的浏览数据${regionLabel}...\n`);

    const reports = await reporter.getSharePagesViews(
      ["study", "report", "podcast"],
      startDate,
      endDate,
      limit,
      region,
    );

    // 按页面类型分类统计
    const studyReports = reports.filter((r) => r.pagePath.startsWith("/study/"));
    const reportReports = reports.filter((r) => r.pagePath.startsWith("/artifacts/report/"));
    const podcastReports = reports.filter((r) => r.pagePath.startsWith("/artifacts/podcast/"));

    console.log(`📄 所有 Share 页面详细数据 (最近${days}天)${regionLabel}:`);
    console.log("─".repeat(80));
    console.log(
      padEndWithWidth("页面路径", 50) +
        padEndWithWidth("浏览量", 10) +
        padEndWithWidth("会话数", 10) +
        "用户数",
    );
    console.log("─".repeat(80));

    let totalAllPageViews = 0;
    let totalAllSessions = 0;
    let totalAllUsers = 0;

    // 显示 Study 页面
    if (studyReports.length > 0) {
      console.log("🎓 Study Pages:");
      for (const report of studyReports) {
        console.log(
          ("  " + report.pagePath).padEnd(50) +
            padEndWithWidth(report.pageViews.toString(), 10) +
            padEndWithWidth(report.sessions.toString(), 10) +
            report.users.toString(),
        );
        totalAllPageViews += report.pageViews;
        totalAllSessions += report.sessions;
        totalAllUsers += report.users;
      }
      console.log("");
    }

    // 显示 Report 页面
    if (reportReports.length > 0) {
      console.log("📊 Report Pages:");
      for (const report of reportReports) {
        console.log(
          ("  " + report.pagePath).padEnd(50) +
            padEndWithWidth(report.pageViews.toString(), 10) +
            padEndWithWidth(report.sessions.toString(), 10) +
            report.users.toString(),
        );
        totalAllPageViews += report.pageViews;
        totalAllSessions += report.sessions;
        totalAllUsers += report.users;
      }
      console.log("");
    }

    // 显示 Podcast 页面
    if (podcastReports.length > 0) {
      console.log("🎙️ Podcast Pages:");
      for (const report of podcastReports) {
        console.log(
          ("  " + report.pagePath).padEnd(50) +
            padEndWithWidth(report.pageViews.toString(), 10) +
            padEndWithWidth(report.sessions.toString(), 10) +
            report.users.toString(),
        );
        totalAllPageViews += report.pageViews;
        totalAllSessions += report.sessions;
        totalAllUsers += report.users;
      }
      console.log("");
    }

    console.log("─".repeat(80));
    console.log(
      padEndWithWidth("所有页面合计", 50) +
        padEndWithWidth(totalAllPageViews.toString(), 10) +
        padEndWithWidth(totalAllSessions.toString(), 10) +
        totalAllUsers.toString(),
    );
    console.log("─".repeat(80));

    console.log(
      `\n✅ 找到 ${reports.length} 个 share 页面 (Study: ${studyReports.length}, Report: ${reportReports.length}, Podcast: ${podcastReports.length})`,
    );
    console.log(`📈 所有页面总浏览量: ${totalAllPageViews.toLocaleString()}`);
  } else {
    // 显示帮助信息
    console.log("📊 Google Analytics 页面浏览量统计工具\n");
    console.log("使用方法:");
    console.log("  查询特定 study:   pnpm analytics study <study-token> [选项]");
    console.log("  查询特定 report:  pnpm analytics report <report-token> [选项]");
    console.log("  查询特定 podcast: pnpm analytics podcast <podcast-token> [选项]");
    console.log("  查询所有 study:   pnpm analytics studies [选项]");
    console.log("  查询所有 report:  pnpm analytics reports [选项]");
    console.log("  查询所有 podcast: pnpm analytics podcasts [选项]");
    console.log("  查询所有页面:     pnpm analytics all [选项]");
    console.log("\n参数说明:");
    console.log("  --days <天数>         查询最近N天的数据 (默认: 30天)");
    console.log("  -n <数量>             限制返回结果数量 (默认: 100条)");
    console.log("  --limit <数量>        同 -n，限制返回结果数量");
    console.log("  --region <地区>       地域过滤 (默认: all)");
    console.log("    all                 全部地区");
    console.log("    mainland            仅大陆+香港+台湾");
    console.log("    global              全球-排除大陆/香港/台湾");
    console.log("\n示例:");
    console.log("  pnpm analytics study abc123");
    console.log("  pnpm analytics study abc123 --days 7");
    console.log("  pnpm analytics report XdUaA9mpwbEcLmxa --days 14");
    console.log("  pnpm analytics podcast xyz789 --days 7");
    console.log("  pnpm analytics studies --days 90 -n 50");
    console.log("  pnpm analytics reports -n 20 --region mainland");
    console.log("  pnpm analytics podcasts --days 30 -n 20 --region global");
    console.log("  pnpm analytics all --days 7 --limit 30 --region mainland");
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });
}

export { GoogleAnalyticsReporter };
