"use server";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { AnalystKind } from "@/prisma/types";

/**
 * Defines the structure for daily statistics
 */
export type DailyStatistics = {
  date: string; // YYYY-MM-DD
  users: {
    total: number;
  };
  payments: {
    total: number;
  };
  studies: {
    total: number;
    byKind: Record<AnalystKind, number>;
    byFeedback: {
      useful: number;
      not_useful: number;
      no_feedback: number;
    };
  };
};

/**
 * Fetches daily aggregated statistics for users, payments, and studies within a given date range.
 * Requires admin privileges.
 *
 * @param startDate The start of the date range (inclusive).
 * @param endDate The end of the date range (inclusive).
 * @returns A ServerActionResult containing an array of daily statistics.
 */
export async function fetchDailyStatistics(
  startDate: Date,
  endDate: Date,
): Promise<ServerActionResult<DailyStatistics[]>> {
  // Use a broad permission for this overview page
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  if (startDate > endDate) {
    return {
      success: false,
      message: "Start date cannot be after end date.",
    };
  }
  // To include the whole end day
  endDate.setHours(23, 59, 59, 999);

  try {
    // 1. Initialize a map to hold statistics for each day in the range
    const statsMap = new Map<string, DailyStatistics>();
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      statsMap.set(dateStr, {
        date: dateStr,
        users: { total: 0 },
        payments: { total: 0 },
        studies: {
          total: 0,
          byKind: {
            [AnalystKind.testing]: 0,
            [AnalystKind.planning]: 0,
            [AnalystKind.insights]: 0,
            [AnalystKind.creation]: 0,
            [AnalystKind.productRnD]: 0,
            [AnalystKind.misc]: 0,
          },
          byFeedback: {
            useful: 0,
            not_useful: 0,
            no_feedback: 0,
          },
        },
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 2. Fetch data using parallel raw SQL queries

    // Daily new user registrations
    const userQuery = prisma.$queryRaw<[{ date: Date; total: bigint }]>`
      SELECT DATE_TRUNC('day', "createdAt")::date as date, COUNT(id) as total
      FROM "User"
      WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY date;
    `;

    // Daily successful payments
    const paymentQuery = prisma.$queryRaw<[{ date: Date; total: bigint }]>`
      SELECT DATE_TRUNC('day', "createdAt")::date as date, COUNT(id) as total
      FROM "PaymentRecord"
      WHERE "status" = 'succeeded'
        AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY date;
    `;

    // Daily total studies
    const totalStudiesQuery = prisma.$queryRaw<[{ date: Date; total: bigint }]>`
      SELECT DATE_TRUNC('day', "createdAt")::date as date, COUNT(id) as total
      FROM "UserChat"
      WHERE kind = 'study'
        AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY date;
    `;

    // Daily studies broken down by kind
    const studiesByKindQuery = prisma.$queryRaw<[{ date: Date; kind: AnalystKind; total: bigint }]>`
      SELECT DATE_TRUNC('day', uc."createdAt")::date as date, a.kind, COUNT(uc.id) as total
      FROM "UserChat" uc
      JOIN "Analyst" a ON a."studyUserChatId" = uc.id
      WHERE uc.kind = 'study'
        AND uc."createdAt" >= ${startDate} AND uc."createdAt" <= ${endDate}
        AND a.kind IS NOT NULL
      GROUP BY date, a.kind;
    `;

    // Daily studies broken down by feedback rating
    const studiesByFeedbackQuery = prisma.$queryRaw<
      [{ date: Date; feedback_rating: string; total: bigint }]
    >`
      SELECT
        DATE_TRUNC('day', "createdAt")::date as date,
        "extra"->'feedback'->>'rating' as feedback_rating,
        COUNT(id) as total
      FROM "UserChat"
      WHERE kind = 'study'
        AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
        AND "extra"->'feedback'->>'rating' IS NOT NULL
      GROUP BY date, feedback_rating;
    `;

    const [
      userResults,
      paymentResults,
      totalStudiesResults,
      studiesByKindResults,
      studiesByFeedbackResults,
    ] = await Promise.all([
      userQuery,
      paymentQuery,
      totalStudiesQuery,
      studiesByKindQuery,
      studiesByFeedbackQuery,
    ]);

    // 3. Process and merge query results into the stats map

    userResults.forEach((row) => {
      const dayStats = statsMap.get(row.date.toISOString().split("T")[0]);
      if (dayStats) dayStats.users.total = Number(row.total);
    });

    paymentResults.forEach((row) => {
      const dayStats = statsMap.get(row.date.toISOString().split("T")[0]);
      if (dayStats) dayStats.payments.total = Number(row.total);
    });

    totalStudiesResults.forEach((row) => {
      const dayStats = statsMap.get(row.date.toISOString().split("T")[0]);
      if (dayStats) dayStats.studies.total = Number(row.total);
    });

    studiesByKindResults.forEach((row) => {
      const dayStats = statsMap.get(row.date.toISOString().split("T")[0]);
      if (dayStats && row.kind) {
        dayStats.studies.byKind[row.kind] = Number(row.total);
      }
    });

    studiesByFeedbackResults.forEach((row) => {
      const dayStats = statsMap.get(row.date.toISOString().split("T")[0]);
      if (dayStats) {
        if (row.feedback_rating === "useful") {
          dayStats.studies.byFeedback.useful = Number(row.total);
        } else if (row.feedback_rating === "not_useful") {
          dayStats.studies.byFeedback.not_useful = Number(row.total);
        }
      }
    });

    // Calculate 'no_feedback' counts based on the total
    statsMap.forEach((dayStats) => {
      dayStats.studies.byFeedback.no_feedback =
        dayStats.studies.total -
        dayStats.studies.byFeedback.useful -
        dayStats.studies.byFeedback.not_useful;
    });

    // 4. Convert map to a sorted array and return
    const resultData = Array.from(statsMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return {
      success: true,
      data: resultData,
    };
  } catch (error) {
    console.error("Failed to fetch daily statistics:", error);
    return {
      success: false,
      message: (error as Error).message,
    };
  }
}
