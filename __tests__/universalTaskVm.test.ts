import { describe, expect, it } from "vitest";

import {
  UniversalToolName,
  type TUniversalMessageWithTool,
} from "../src/app/(universal)/tools/types";
import {
  extractSubAgentToolPartsFromMessages,
  extractTasksFromMessages,
} from "../src/app/(universal)/universal/task-vm";

describe("extractTasksFromMessages", () => {
  it("extracts only createStudySubAgent tasks and maps title/summary", () => {
    const messages = [
      {
        id: "m1",
        role: "assistant",
        parts: [
          {
            type: `tool-${UniversalToolName.createStudySubAgent}`,
            toolCallId: "task-done",
            state: "output-available",
            input: {
              subAgentTitle: "Find quick insight",
            },
            output: {
              status: "completed",
              resultSummary: "Done summary",
              subAgentChatId: 12,
              subAgentChatToken: "study-token-1",
            },
          },
          {
            type: `tool-${UniversalToolName.webSearch}`,
            toolCallId: "not-a-task",
            state: "output-available",
            output: { plainText: "ignored" },
          },
        ],
      },
    ] as unknown as TUniversalMessageWithTool[];

    const tasks = extractTasksFromMessages(messages);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      toolCallId: "task-done",
      title: "Find quick insight",
      summary: "Done summary",
      status: "done",
      subAgentChatId: 12,
      subAgentChatToken: "study-token-1",
    });
  });

  it("sorts tasks by status then recency", () => {
    const messages = [
      {
        id: "m1",
        role: "assistant",
        parts: [
          {
            type: `tool-${UniversalToolName.createStudySubAgent}`,
            toolCallId: "done-older",
            state: "output-available",
            input: { taskRequirement: "old" },
            output: { status: "completed", resultSummary: "ok" },
          },
        ],
      },
      {
        id: "m2",
        role: "assistant",
        parts: [
          {
            type: `tool-${UniversalToolName.createStudySubAgent}`,
            toolCallId: "error-newer",
            state: "output-error",
            errorText: "boom",
            input: { taskRequirement: "new" },
          },
        ],
      },
      {
        id: "m3",
        role: "assistant",
        parts: [
          {
            type: `tool-${UniversalToolName.createStudySubAgent}`,
            toolCallId: "running-latest",
            state: "input-available",
            input: { taskRequirement: "latest" },
          },
        ],
      },
    ] as unknown as TUniversalMessageWithTool[];

    const tasks = extractTasksFromMessages(messages);
    expect(tasks.map((task) => task.toolCallId)).toEqual([
      "running-latest",
      "error-newer",
      "done-older",
    ]);
    expect(tasks[0].summary).toBe("In progress...");
    expect(tasks[1].summary).toBe("boom");
  });

  it("keeps output-available task as running when tool output status is running", () => {
    const messages = [
      {
        id: "m-running",
        role: "assistant",
        parts: [
          {
            type: `tool-${UniversalToolName.createStudySubAgent}`,
            toolCallId: "task-running-output",
            state: "output-available",
            input: { subAgentTitle: "China short drama" },
            output: {
              status: "running",
              resultSummary: "Sub-agent started, streaming progress in panel.",
              subAgentChatId: 88,
              subAgentChatToken: "study-token-running",
            },
          },
        ],
      },
    ] as unknown as TUniversalMessageWithTool[];

    const tasks = extractTasksFromMessages(messages);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      toolCallId: "task-running-output",
      status: "running",
      subAgentChatToken: "study-token-running",
    });
    expect(tasks[0].summary).toContain("streaming progress");
  });

  it("marks task as running when output exists but token is not returned yet", () => {
    const messages = [
      {
        id: "m-running-no-token",
        role: "assistant",
        parts: [
          {
            type: `tool-${UniversalToolName.createStudySubAgent}`,
            toolCallId: "task-running-no-token",
            state: "output-available",
            input: { subAgentTitle: "SEA short drama" },
            output: {
              status: "running",
              resultSummary: "Sub-agent bootstrapping...",
            },
          },
        ],
      },
    ] as unknown as TUniversalMessageWithTool[];

    const tasks = extractTasksFromMessages(messages);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe("running");
    expect(tasks[0].subAgentChatToken).toBeNull();
  });
});

describe("extractSubAgentToolPartsFromMessages", () => {
  it("maps study tools to semantic stage and title", () => {
    const messages = [
      {
        id: "m1",
        role: "assistant",
        parts: [
          {
            type: "tool-interviewChat",
            toolCallId: "step-interview",
            state: "output-available",
            output: { plainText: "Interview completed with 3 personas." },
          },
          {
            type: "tool-generateReport",
            toolCallId: "step-report",
            state: "output-available",
            output: { plainText: "Report is generated and ready." },
          },
        ],
      },
    ] as unknown as Array<{ id: string; role: string; parts: unknown[] }>;

    const parts = extractSubAgentToolPartsFromMessages(messages);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({
      toolCallId: "step-interview",
      stage: "interview",
      semanticTitle: "Run persona interviews",
    });
    expect(parts[1]).toMatchObject({
      toolCallId: "step-report",
      stage: "delivery",
      semanticTitle: "Generate report",
    });
  });

  it("falls back to semantic summary when plainText is meaningless", () => {
    const messages = [
      {
        id: "m1",
        role: "assistant",
        parts: [
          {
            type: "tool-interviewChat",
            toolCallId: "numeric-only",
            state: "output-available",
            output: { plainText: "1" },
          },
        ],
      },
    ] as unknown as Array<{ id: string; role: string; parts: unknown[] }>;

    const parts = extractSubAgentToolPartsFromMessages(messages);
    expect(parts).toHaveLength(1);
    expect(parts[0].summary).toBe(
      "Interviewing selected personas for decision and behavior signals.",
    );
  });

  it("returns tool parts in execution order (old -> new) and marks running state", () => {
    const messages = [
      {
        id: "m1",
        role: "assistant",
        parts: [
          {
            type: "tool-scoutTaskChat",
            toolCallId: "step-1",
            state: "output-available",
            output: { plainText: "Scouting completed." },
          },
        ],
      },
      {
        id: "m2",
        role: "assistant",
        parts: [
          {
            type: "tool-interviewChat",
            toolCallId: "step-2",
            state: "input-available",
            input: { personas: [{ id: 1, name: "Alex" }], instruction: "Test direction" },
          },
        ],
      },
    ] as unknown as Array<{ id: string; role: string; parts: unknown[] }>;

    const parts = extractSubAgentToolPartsFromMessages(messages);
    expect(parts.map((part) => part.toolCallId)).toEqual(["step-1", "step-2"]);
    expect(parts[1].state).toBe("input-available");
    expect(parts[1].summary).toBe(
      "Interviewing selected personas for decision and behavior signals.",
    );
  });
});
