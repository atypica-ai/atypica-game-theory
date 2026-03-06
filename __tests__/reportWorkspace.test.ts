import { describe, expect, it } from "vitest";
import {
  buildReportWorkspaceMeta,
  buildReportWorkspaceRelativeDir,
  buildReportWorkspaceSummary,
} from "../src/app/(study)/agents/reportWorkspaceShared";

describe("reportWorkspace helpers", () => {
  it("builds stable workspace relative directory", () => {
    expect(buildReportWorkspaceRelativeDir("chat_abc", "report_xyz")).toBe(
      "study-subagents/chat_abc/reports/report_xyz",
    );
  });

  it("builds meta with required fields", () => {
    const meta = buildReportWorkspaceMeta({
      reportToken: "report_xyz",
      studyUserChatId: 123,
      studyUserChatToken: "chat_abc",
      instruction: "focus on decision journey",
      extra: {
        title: "Test Title",
        description: "Test Description",
      },
      generatedAt: new Date("2026-03-01T00:00:00.000Z"),
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      updatedAt: new Date("2026-03-01T01:00:00.000Z"),
    });

    expect(meta.version).toBe(1);
    expect(meta.workspaceReportDir).toBe("study-subagents/chat_abc/reports/report_xyz");
    expect(meta.artifact.sharePath).toBe("/artifacts/report/report_xyz/share");
    expect(meta.artifact.rawPath).toBe("/artifacts/report/report_xyz/raw");
    expect(meta.artifact.coverPath).toBe("/artifacts/report/report_xyz/cover");
  });

  it("builds markdown summary with critical links", () => {
    const meta = buildReportWorkspaceMeta({
      reportToken: "report_xyz",
      studyUserChatId: 123,
      studyUserChatToken: "chat_abc",
      instruction: "focus on decision journey",
      extra: {
        title: "Test Title",
        description: "Test Description",
      },
      generatedAt: new Date("2026-03-01T00:00:00.000Z"),
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      updatedAt: new Date("2026-03-01T01:00:00.000Z"),
    });

    const summary = buildReportWorkspaceSummary(meta);
    expect(summary).toContain("/artifacts/report/report_xyz/share");
    expect(summary).toContain("./meta.json");
    expect(summary).toContain("./report.html");
  });
});
