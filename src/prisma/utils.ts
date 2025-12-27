import { prisma } from "./prisma";

export async function mergeExtra({
  tableName,
  extra,
  id,
}: {
  tableName:
    | "User"
    | "Sage"
    | "SageSource"
    | "SageInterview"
    | "SageChat"
    | "SageKnowledgeGap"
    | "UserProfile"
    | "AnalystReport"
    | "AnalystPodcast"
    | "InterviewSession"
    | "InterviewReport"
    | "DiscussionTimeline"
    | "UserChat"
    | "Subscription"
    | "Team"
    | "AttachmentFile";
  extra: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  id: number;
}) {
  // $executeRaw 不支持 dynamic table name
  // await prisma.$executeRaw`
  //   UPDATE "User"
  //   SET "extra" = COALESCE("extra", '{}') || ${JSON.stringify({ ...extra })}::jsonb,
  //       "updatedAt" = NOW()
  //   WHERE "id" = ${id}
  // `;
  await prisma.$executeRawUnsafe(
    `UPDATE "${tableName}" SET "extra" = COALESCE("extra", '{}') || $2::jsonb, "updatedAt" = NOW() WHERE "id" = $1;`,
    id,
    JSON.stringify({ ...extra }),
  );
}
