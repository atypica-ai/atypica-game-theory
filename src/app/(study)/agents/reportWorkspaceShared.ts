import type { AnalystReportExtra } from "@/prisma/client";

export type ReportWorkspaceMeta = {
  version: 1;
  reportToken: string;
  studyUserChatId: number;
  studyUserChatToken: string;
  workspaceReportDir: string;
  artifact: {
    sharePath: string;
    rawPath: string;
    coverPath: string;
  };
  report: {
    title: string;
    description: string;
    instruction: string;
    generatedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  writtenAt: string;
};

export function buildReportWorkspaceRelativeDir(studyUserChatToken: string, reportToken: string): string {
  return `study-subagents/${studyUserChatToken}/reports/${reportToken}`;
}

export function buildReportWorkspaceMeta({
  reportToken,
  studyUserChatId,
  studyUserChatToken,
  instruction,
  extra,
  generatedAt,
  createdAt,
  updatedAt,
}: {
  reportToken: string;
  studyUserChatId: number;
  studyUserChatToken: string;
  instruction: string;
  extra: AnalystReportExtra;
  generatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ReportWorkspaceMeta {
  const workspaceReportDir = buildReportWorkspaceRelativeDir(studyUserChatToken, reportToken);

  return {
    version: 1,
    reportToken,
    studyUserChatId,
    studyUserChatToken,
    workspaceReportDir,
    artifact: {
      sharePath: `/artifacts/report/${reportToken}/share`,
      rawPath: `/artifacts/report/${reportToken}/raw`,
      coverPath: `/artifacts/report/${reportToken}/cover`,
    },
    report: {
      title: extra.title ?? "",
      description: extra.description ?? "",
      instruction,
      generatedAt: generatedAt?.toISOString() ?? null,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    },
    writtenAt: new Date().toISOString(),
  };
}

export function buildReportWorkspaceSummary(meta: ReportWorkspaceMeta): string {
  return [
    `# Report Workspace Snapshot`,
    "",
    `- Report Token: ${meta.reportToken}`,
    `- Study Chat Token: ${meta.studyUserChatToken}`,
    `- Generated At: ${meta.report.generatedAt ?? "pending"}`,
    `- Written At: ${meta.writtenAt}`,
    "",
    `## Artifact Links`,
    `- Share: ${meta.artifact.sharePath}`,
    `- Raw: ${meta.artifact.rawPath}`,
    `- Cover: ${meta.artifact.coverPath}`,
    "",
    `## Study Context`,
    `- Title: ${meta.report.title || "(empty)"}`,
    `- Description: ${meta.report.description || "(empty)"}`,
    `- Instruction: ${meta.report.instruction || "(empty)"}`,
    "",
    `## Suggested Next Steps`,
    `1. Read ./meta.json for structured fields.`,
    `2. Read ./report.html for full artifact content.`,
    `3. Use ../latest.json to discover most recent report quickly.`,
    "",
  ].join("\n");
}
