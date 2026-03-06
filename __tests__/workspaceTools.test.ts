import { describe, expect, it } from "vitest";
import { normalizeWorkspaceRelativePath } from "../src/lib/skill/workspaceTools";

describe("workspaceTools path normalization", () => {
  it("normalizes regular relative paths", () => {
    expect(normalizeWorkspaceRelativePath("study-subagents/a/reports/b/meta.json")).toBe(
      "study-subagents/a/reports/b/meta.json",
    );
    expect(normalizeWorkspaceRelativePath("workspace/study-subagents/a/../a/reports/b/meta.json")).toBe(
      "study-subagents/a/reports/b/meta.json",
    );
  });

  it("rejects traversal and absolute paths", () => {
    expect(() => normalizeWorkspaceRelativePath("../secret.txt")).toThrow(/traversal/i);
    expect(() => normalizeWorkspaceRelativePath("study-subagents/../../secret.txt")).toThrow(/traversal/i);
    expect(() => normalizeWorkspaceRelativePath("/etc/passwd")).toThrow(/absolute/i);
  });

  it("supports empty path only when explicitly allowed", () => {
    expect(normalizeWorkspaceRelativePath("", true)).toBe("");
    expect(() => normalizeWorkspaceRelativePath("")).toThrow(/empty/i);
  });
});
