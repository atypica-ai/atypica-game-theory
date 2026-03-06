import {
  ConfirmPanelResearchPlanInput,
  ConfirmPanelResearchPlanOutput,
} from "@/app/(panel)/tools/confirmPanelResearchPlan/types";
import {
  RequestSelectPersonasToolInput,
  RequestSelectPersonasToolOutput,
} from "@/app/(panel)/tools/requestSelectPersonas/types";
import { UpdatePanelToolInput, UpdatePanelToolOutput } from "@/app/(panel)/tools/updatePanel/types";
import {
  DiscussionChatResult,
  DiscussionChatToolInput,
} from "@/app/(study)/tools/discussionChat/types";
import {
  GeneratePodcastResult,
  GeneratePodcastToolInput,
} from "@/app/(study)/tools/generatePodcast/types";
import {
  GenerateReportResult,
  GenerateReportToolInput,
} from "@/app/(study)/tools/generateReport/types";
import {
  InterviewChatResult,
  InterviewChatToolInput,
} from "@/app/(study)/tools/interviewChat/types";
import {
  SearchPersonasToolInput,
  SearchPersonasToolResult,
} from "@/app/(study)/tools/searchPersonas/types";
import { DeepResearchInput, DeepResearchOutput } from "@/app/(deepResearch)/types";
import { UIDataTypes, UIMessage } from "ai";

/**
 * Universal Agent Tool Names
 * Completely independent from Study tools
 */
export enum UniversalToolName {
  // Core thinking and reasoning
  reasoningThinking = "reasoningThinking",

  // Web capabilities
  webSearch = "webSearch",
  webFetch = "webFetch",

  // bash-tool: Skill filesystem operations (in-memory sandbox)
  bash = "bash",
  readFile = "readFile",
  writeFile = "writeFile",

  // Skill management
  listSkills = "listSkills",

  // Study agent
  searchPersonas = "searchPersonas",
  interviewChat = "interviewChat",
  discussionChat = "discussionChat",
  generateReport = "generateReport",
  generatePodcast = "generatePodcast",
  deepResearch = "deepResearch",

  // Panel
  requestSelectPersonas = "requestSelectPersonas",
  updatePanel = "updatePanel",
  confirmPanelResearchPlan = "confirmPanelResearchPlan",

  // Error handling
  toolCallError = "toolCallError",
}

/**
 * Universal Agent UI Tools
 * Maps tool names to their input/output types for UI rendering
 */
export type UniversalUITools = {
  [UniversalToolName.requestSelectPersonas]: {
    input: RequestSelectPersonasToolInput;
    output: RequestSelectPersonasToolOutput;
  };
  [UniversalToolName.searchPersonas]: {
    input: SearchPersonasToolInput;
    output: SearchPersonasToolResult;
  };
  [UniversalToolName.interviewChat]: {
    input: InterviewChatToolInput;
    output: InterviewChatResult;
  };
  [UniversalToolName.discussionChat]: {
    input: DiscussionChatToolInput;
    output: DiscussionChatResult;
  };
  [UniversalToolName.deepResearch]: {
    input: DeepResearchInput;
    output: DeepResearchOutput;
  };
  [UniversalToolName.generateReport]: {
    input: GenerateReportToolInput;
    output: GenerateReportResult;
  };
  [UniversalToolName.generatePodcast]: {
    input: GeneratePodcastToolInput;
    output: GeneratePodcastResult;
  };
  [UniversalToolName.updatePanel]: {
    input: UpdatePanelToolInput;
    output: UpdatePanelToolOutput;
  };
  [UniversalToolName.confirmPanelResearchPlan]: {
    input: ConfirmPanelResearchPlanInput;
    output: ConfirmPanelResearchPlanOutput;
  };
};

export type TUniversalMessageWithTool = UIMessage<unknown, UIDataTypes, UniversalUITools>;

export type TAddUniversalUIToolResult = <TOOL extends keyof UniversalUITools>({
  tool,
  toolCallId,
  output,
}: {
  tool: TOOL;
  toolCallId: string;
  output: UniversalUITools[TOOL]["output"];
}) => Promise<void>;
