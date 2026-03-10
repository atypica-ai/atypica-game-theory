import { prisma } from "@/prisma/prisma";
import { ITXClientDenyList } from "@prisma/client/runtime/client";

export async function mergeExtra({
  tableName,
  extra,
  id,
  tx,
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
    | "Persona"
    | "PersonaPanel"
    | "InterviewSession"
    | "InterviewReport"
    | "DiscussionTimeline"
    | "UserChat"
    | "InterviewProject"
    | "Subscription"
    | "Team"
    | "AttachmentFile";
  extra: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  id: number;
  tx?: Omit<typeof prisma, ITXClientDenyList>;
}) {
  if (!tx) tx = prisma;
  // $executeRaw 不支持 dynamic table name
  // await prisma.$executeRaw`
  //   UPDATE "User"
  //   SET "extra" = COALESCE("extra", '{}') || ${JSON.stringify({ ...extra })}::jsonb,
  //       "updatedAt" = NOW()
  //   WHERE "id" = ${id}
  // `;
  await tx.$executeRawUnsafe(
    `UPDATE "${tableName}" SET "extra" = COALESCE("extra", '{}') || $2::jsonb, "updatedAt" = NOW() WHERE "id" = $1;`,
    id,
    JSON.stringify({ ...extra }),
  );
}
