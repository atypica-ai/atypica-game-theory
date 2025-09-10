#!/usr/bin/env tsx

import { loadEnvConfig } from "@next/env";
import { GoogleAnalyticsReporter } from "../src/lib/analytics/google/reporter.js";

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    command: null as string | null,
    token: null as string | null,
    days: 30, // 默认30天
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
  const { command: firstArg, token: secondArg, days } = parseArgs();
  const { startDate, endDate } = getDateRange(days);

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
    console.log("🔍 正在获取 /artifacts/report/*/share 页面的浏览数据...\n");

    const reports = await reporter.getReportSharePagesViews(startDate, endDate);

    console.log("📄 /artifacts/report/*/share 页面详细数据:");
    console.log("─".repeat(80));
    console.log("页面路径".padEnd(50) + "浏览量".padEnd(10) + "会话数".padEnd(10) + "用户数");
    console.log("─".repeat(80));

    let totalReportPageViews = 0;
    let totalReportSessions = 0;
    let totalReportUsers = 0;

    for (const report of reports) {
      console.log(
        report.pagePath.padEnd(50) +
          report.pageViews.toString().padEnd(10) +
          report.sessions.toString().padEnd(10) +
          report.users.toString(),
      );

      totalReportPageViews += report.pageViews;
      totalReportSessions += report.sessions;
      totalReportUsers += report.users;
    }

    console.log("─".repeat(80));
    console.log(
      "Report页面合计".padEnd(50) +
        totalReportPageViews.toString().padEnd(10) +
        totalReportSessions.toString().padEnd(10) +
        totalReportUsers.toString(),
    );
    console.log("─".repeat(80));

    console.log(`\n✅ 找到 ${reports.length} 个 /artifacts/report/*/share 页面`);
    console.log(`📈 Report页面总浏览量: ${totalReportPageViews.toLocaleString()}`);
  } else if (firstArg === "studies") {
    // 查询所有 study share 页面的数据
    console.log("🔍 正在获取 /study/*/share/ 页面的浏览数据...\n");

    // 获取指定天数的数据
    const reports = await reporter.getPageViews("/study/*/share/", startDate, endDate);

    console.log("📄 /study/*/share/ 页面详细数据:");
    console.log("─".repeat(80));
    console.log("页面路径".padEnd(50) + "浏览量".padEnd(10) + "会话数".padEnd(10) + "用户数");
    console.log("─".repeat(80));

    let totalSharePageViews = 0;
    let totalShareSessions = 0;
    let totalShareUsers = 0;

    for (const report of reports) {
      console.log(
        report.pagePath.padEnd(50) +
          report.pageViews.toString().padEnd(10) +
          report.sessions.toString().padEnd(10) +
          report.users.toString(),
      );

      totalSharePageViews += report.pageViews;
      totalShareSessions += report.sessions;
      totalShareUsers += report.users;
    }

    console.log("─".repeat(80));
    console.log(
      "Study页面合计".padEnd(50) +
        totalSharePageViews.toString().padEnd(10) +
        totalShareSessions.toString().padEnd(10) +
        totalShareUsers.toString(),
    );
    console.log("─".repeat(80));

    console.log(`\n✅ 找到 ${reports.length} 个 /study/*/share/ 页面`);
    console.log(`📈 Study页面总浏览量: ${totalSharePageViews.toLocaleString()}`);
  } else if (firstArg === "all") {
    // 查询所有类型的 share 页面数据
    console.log("🔍 正在获取所有 share 页面的浏览数据...\n");

    const reports = await reporter.getSharePagesViews(["study", "report"], startDate, endDate);

    // 按页面类型分类统计
    const studyReports = reports.filter((r) => r.pagePath.startsWith("/study/"));
    const reportReports = reports.filter((r) => r.pagePath.startsWith("/artifacts/report/"));

    console.log(`📄 所有 Share 页面详细数据 (最近${days}天):`);
    console.log("─".repeat(80));
    console.log("页面路径".padEnd(50) + "浏览量".padEnd(10) + "会话数".padEnd(10) + "用户数");
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
            report.pageViews.toString().padEnd(10) +
            report.sessions.toString().padEnd(10) +
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
            report.pageViews.toString().padEnd(10) +
            report.sessions.toString().padEnd(10) +
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
      "所有页面合计".padEnd(50) +
        totalAllPageViews.toString().padEnd(10) +
        totalAllSessions.toString().padEnd(10) +
        totalAllUsers.toString(),
    );
    console.log("─".repeat(80));

    console.log(
      `\n✅ 找到 ${reports.length} 个 share 页面 (Study: ${studyReports.length}, Report: ${reportReports.length})`,
    );
    console.log(`📈 所有页面总浏览量: ${totalAllPageViews.toLocaleString()}`);
  } else {
    // 显示帮助信息
    console.log("📊 Google Analytics 页面浏览量统计工具\n");
    console.log("使用方法:");
    console.log("  查询特定 study:  pnpm analytics study <study-token> [--days <天数>]");
    console.log("  查询特定 report: pnpm analytics report <report-token> [--days <天数>]");
    console.log("  查询所有 study:  pnpm analytics studies [--days <天数>]");
    console.log("  查询所有 report: pnpm analytics reports [--days <天数>]");
    console.log("  查询所有页面:    pnpm analytics all [--days <天数>]");
    console.log("\n参数说明:");
    console.log("  --days <天数>    查询最近N天的数据 (默认: 30天)");
    console.log("\n示例:");
    console.log("  pnpm analytics study abc123");
    console.log("  pnpm analytics study abc123 --days 7");
    console.log("  pnpm analytics report XdUaA9mpwbEcLmxa --days 14");
    console.log("  pnpm analytics studies --days 90");
    console.log("  pnpm analytics reports");
    console.log("  pnpm analytics all --days 7");
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
