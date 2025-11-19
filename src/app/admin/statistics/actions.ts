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
  timezone: string = "UTC",
): Promise<ServerActionResult<DailyStatistics[]>> {
  // Use a broad permission for this overview page
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  if (startDate > endDate) {
    return {
      success: false,
      message: "Start date cannot be after end date.",
    };
  }

  // Helper function to format date without timezone conversion
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Get date strings in user's local timezone
  const startDateStr = formatDate(startDate);
  const endDateStr = formatDate(endDate);

  // Construct timestamp strings with user timezone
  // These will be interpreted as timestamps in the user's timezone, then converted to UTC
  const startTimestampInUserTZ = `${startDateStr} 00:00:00`;
  const endTimestampInUserTZ = `${endDateStr} 23:59:59.999`;

  try {
    // 1. Initialize a map to hold statistics for each day in the range
    const statsMap = new Map<string, DailyStatistics>();
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = formatDate(currentDate);
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
    // Use AT TIME ZONE to convert user timezone timestamps to UTC for comparison

    // Daily new user registrations
    const userQuery = prisma.$queryRaw<[{ date: Date; total: bigint }]>`
      SELECT DATE("createdAt" AT TIME ZONE ${timezone})::date as date, COUNT(id) as total
      FROM "User"
      WHERE "createdAt" >= (${startTimestampInUserTZ}::timestamp AT TIME ZONE ${timezone})
        AND "createdAt" <= (${endTimestampInUserTZ}::timestamp AT TIME ZONE ${timezone})
      GROUP BY date;
    `;

    // Daily successful payments
    const paymentQuery = prisma.$queryRaw<[{ date: Date; total: bigint }]>`
      SELECT DATE("createdAt" AT TIME ZONE ${timezone})::date as date, COUNT(id) as total
      FROM "PaymentRecord"
      WHERE "status" = 'succeeded'
        AND "createdAt" >= (${startTimestampInUserTZ}::timestamp AT TIME ZONE ${timezone})
        AND "createdAt" <= (${endTimestampInUserTZ}::timestamp AT TIME ZONE ${timezone})
      GROUP BY date;
    `;

    // Daily total studies
    const totalStudiesQuery = prisma.$queryRaw<[{ date: Date; total: bigint }]>`
      SELECT DATE("createdAt" AT TIME ZONE ${timezone})::date as date, COUNT(id) as total
      FROM "UserChat"
      WHERE kind = 'study'
        AND "createdAt" >= (${startTimestampInUserTZ}::timestamp AT TIME ZONE ${timezone})
        AND "createdAt" <= (${endTimestampInUserTZ}::timestamp AT TIME ZONE ${timezone})
      GROUP BY date;
    `;

    // Daily studies broken down by kind
    const studiesByKindQuery = prisma.$queryRaw<[{ date: Date; kind: AnalystKind; total: bigint }]>`
      SELECT DATE(uc."createdAt" AT TIME ZONE ${timezone})::date as date, a.kind, COUNT(uc.id) as total
      FROM "UserChat" uc
      JOIN "Analyst" a ON a."studyUserChatId" = uc.id
      WHERE uc.kind = 'study'
        AND uc."createdAt" >= (${startTimestampInUserTZ}::timestamp AT TIME ZONE ${timezone})
        AND uc."createdAt" <= (${endTimestampInUserTZ}::timestamp AT TIME ZONE ${timezone})
        AND a.kind IS NOT NULL
      GROUP BY date, a.kind;
    `;

    // Daily studies broken down by feedback rating
    const studiesByFeedbackQuery = prisma.$queryRaw<
      [{ date: Date; feedback_rating: string; total: bigint }]
    >`
      SELECT
        DATE("createdAt" AT TIME ZONE ${timezone})::date as date,
        "extra"->'feedback'->>'rating' as feedback_rating,
        COUNT(id) as total
      FROM "UserChat"
      WHERE kind = 'study'
        AND "createdAt" >= (${startTimestampInUserTZ}::timestamp AT TIME ZONE ${timezone})
        AND "createdAt" <= (${endTimestampInUserTZ}::timestamp AT TIME ZONE ${timezone})
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
      const dayStats = statsMap.get(formatDate(row.date));
      if (dayStats) dayStats.users.total = Number(row.total);
    });

    paymentResults.forEach((row) => {
      const dayStats = statsMap.get(formatDate(row.date));
      if (dayStats) dayStats.payments.total = Number(row.total);
    });

    totalStudiesResults.forEach((row) => {
      const dayStats = statsMap.get(formatDate(row.date));
      if (dayStats) dayStats.studies.total = Number(row.total);
    });

    studiesByKindResults.forEach((row) => {
      const dayStats = statsMap.get(formatDate(row.date));
      if (dayStats && row.kind) {
        dayStats.studies.byKind[row.kind] = Number(row.total);
      }
    });

    studiesByFeedbackResults.forEach((row) => {
      const dayStats = statsMap.get(formatDate(row.date));
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

/**
 * User statistics by country
 */
export type UsersByCountry = {
  country: string;
  count: number;
};

/**
 * Fetches user count grouped by country from UserProfile.lastLogin data
 * Filters users by registration date (createdAt)
 */
export async function fetchUsersByCountry(
  startDate: Date,
  endDate: Date,
  timezone: string = "UTC",
): Promise<ServerActionResult<UsersByCountry[]>> {
  await checkAdminAuth([AdminPermission.VIEW_STATISTICS]);

  if (startDate > endDate) {
    return {
      success: false,
      message: "Start date cannot be after end date.",
    };
  }

  // Helper function to format date
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Get date strings in user's local timezone
  const startDateStr = formatDate(startDate);
  const endDateStr = formatDate(endDate);

  // Construct timestamp strings with user timezone
  const startTimestampInUserTZ = `${startDateStr} 00:00:00`;
  const endTimestampInUserTZ = `${endDateStr} 23:59:59.999`;

  try {
    // Use SQL aggregation to group by country
    const results = await prisma.$queryRaw<
      Array<{ country: string | null; count: bigint }>
    >`
      SELECT
        COALESCE(
          up."lastLogin"::jsonb->'geo'->>'country',
          'Unknown'
        ) as country,
        COUNT(*)::bigint as count
      FROM "UserProfile" up
      JOIN "User" u ON u.id = up."userId"
      WHERE u."createdAt" >= (${startTimestampInUserTZ}::timestamp AT TIME ZONE ${timezone})
        AND u."createdAt" <= (${endTimestampInUserTZ}::timestamp AT TIME ZONE ${timezone})
      GROUP BY country
      ORDER BY count DESC
      LIMIT 20
    `;

    const data = results.map((row) => ({
      country: row.country || "Unknown",
      count: Number(row.count),
    }));

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Failed to fetch users by country:", error);
    return {
      success: false,
      message: (error as Error).message,
    };
  }
}

/**
 * User statistics by acquisition source
 */
export type UsersBySource = {
  source: string;
  count: number;
};

/**
 * Fetches user count grouped by acquisition source from UserProfile.extra
 * Priority: utm_medium/utm_source > utm_source > referer hostname
 * Filters users by registration date (createdAt)
 */
export async function fetchUsersBySource(
  startDate: Date,
  endDate: Date,
  timezone: string = "UTC",
): Promise<ServerActionResult<UsersBySource[]>> {
  await checkAdminAuth([AdminPermission.VIEW_STATISTICS]);

  if (startDate > endDate) {
    return {
      success: false,
      message: "Start date cannot be after end date.",
    };
  }

  // Helper function to format date
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Get date strings in user's local timezone
  const startDateStr = formatDate(startDate);
  const endDateStr = formatDate(endDate);

  // Construct timestamp strings with user timezone
  const startTimestampInUserTZ = `${startDateStr} 00:00:00`;
  const endTimestampInUserTZ = `${endDateStr} 23:59:59.999`;

  try {
    // Use SQL aggregation with CASE WHEN to determine source priority
    const results = await prisma.$queryRaw<Array<{ source: string | null; count: bigint }>>`
      SELECT
        CASE
          WHEN up.extra::jsonb->'acquisition'->'utm'->>'utm_medium' IS NOT NULL
               AND up.extra::jsonb->'acquisition'->'utm'->>'utm_source' IS NOT NULL
            THEN CONCAT(
              up.extra::jsonb->'acquisition'->'utm'->>'utm_source',
              '/',
              up.extra::jsonb->'acquisition'->'utm'->>'utm_medium'
            )
          WHEN up.extra::jsonb->'acquisition'->'utm'->>'utm_source' IS NOT NULL
            THEN up.extra::jsonb->'acquisition'->'utm'->>'utm_source'
          WHEN up.extra::jsonb->'acquisition'->'referer'->>'hostname' IS NOT NULL
            THEN up.extra::jsonb->'acquisition'->'referer'->>'hostname'
          ELSE 'Direct'
        END as source,
        COUNT(*)::bigint as count
      FROM "UserProfile" up
      JOIN "User" u ON u.id = up."userId"
      WHERE u."createdAt" >= (${startTimestampInUserTZ}::timestamp AT TIME ZONE ${timezone})
        AND u."createdAt" <= (${endTimestampInUserTZ}::timestamp AT TIME ZONE ${timezone})
      GROUP BY source
      ORDER BY count DESC
      LIMIT 20
    `;

    const data = results.map((row) => ({
      source: row.source || "Direct",
      count: Number(row.count),
    }));

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Failed to fetch users by source:", error);
    return {
      success: false,
      message: (error as Error).message,
    };
  }
}
