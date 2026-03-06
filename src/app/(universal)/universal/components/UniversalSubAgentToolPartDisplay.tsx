"use client";

import { ReasoningThinkingResultMessage } from "@/ai/tools/experts/reasoningThinking/ReasoningThinkingResultMessage";
import { WebSearchResultMessage } from "@/ai/tools/experts/webSearch/WebSearchResultMessage";
import {
  SocialPostCommentsResultMessage,
  SocialPostsResultMessage,
} from "@/ai/tools/social/ToolMessage";
import { GeneratePodcastResultMessage } from "@/app/(study)/tools/generatePodcast/GeneratePodcastResultMessage";
import { GenerateReportResultMessage } from "@/app/(study)/tools/generateReport/GenerateReportResultMessage";
import { InterviewExecutionView } from "@/app/(study)/study/console/shared/InterviewExecutionView";
import { ScoutExecutionView } from "@/app/(study)/study/console/shared/ScoutExecutionView";
import { ScoutTaskChatResultMessage } from "@/app/(study)/tools/scoutTaskChat/ScoutTaskChatResultMessage";
import { SearchPersonasResultMessage } from "@/app/(study)/tools/searchPersonas/SearchPersonasResultMessage";
import { StudyToolName, TStudyMessageWithTool } from "@/app/(study)/tools/types";
import { StudyToolUIPartDisplay } from "@/app/(study)/tools/ui";
import { UniversalSubAgentToolPartVM } from "@/app/(universal)/universal/task-vm";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Streamdown } from "streamdown";

const SOCIAL_POST_TOOLS = new Set<string>([
  StudyToolName.xhsSearch,
  StudyToolName.dySearch,
  StudyToolName.tiktokSearch,
  StudyToolName.insSearch,
  StudyToolName.xhsUserNotes,
  StudyToolName.dyUserPosts,
  StudyToolName.tiktokUserPosts,
  StudyToolName.insUserPosts,
  StudyToolName.twitterSearch,
  StudyToolName.twitterUserPosts,
]);

const SOCIAL_COMMENT_TOOLS = new Set<string>([
  StudyToolName.xhsNoteComments,
  StudyToolName.dyPostComments,
  StudyToolName.tiktokPostComments,
  StudyToolName.insPostComments,
  StudyToolName.twitterPostComments,
]);

function isOutputAvailablePart(part: UniversalSubAgentToolPartVM["part"]) {
  return part.type !== "dynamic-tool" && part.state === "output-available";
}

function extractPlainText(part: UniversalSubAgentToolPartVM["part"]): string {
  if (part.type === "dynamic-tool") {
    if (part.state !== "output-available") return "";
    return typeof part.output === "string" ? part.output : JSON.stringify(part.output);
  }
  if (part.state !== "output-available") return "";
  if (part.output && typeof part.output === "object" && "plainText" in part.output) {
    const plainText = (part.output as Record<string, unknown>).plainText;
    return typeof plainText === "string" ? plainText : "";
  }
  return "";
}

function UniversalBuildPersonaResult({ part }: { part: UniversalSubAgentToolPartVM["part"] }) {
  if (!isOutputAvailablePart(part)) return null;
  const output = part.output as Record<string, unknown>;
  const personas = Array.isArray(output.personas)
    ? output.personas.filter(
        (persona): persona is { personaId: number; name: string; tags?: string[] } =>
          !!persona &&
          typeof persona === "object" &&
          "personaId" in persona &&
          typeof (persona as { personaId?: unknown }).personaId === "number" &&
          "name" in persona &&
          typeof (persona as { name?: unknown }).name === "string",
      )
    : [];

  if (!personas.length) {
    return <div className="text-sm text-muted-foreground">No persona built</div>;
  }

  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-sm">
      <div className="font-medium mb-2">🤖 已构建 {personas.length} 个 Persona</div>
      <div className="space-y-1">
        {personas.map((persona) => (
          <div className="flex items-center gap-2" key={persona.personaId}>
            <HippyGhostAvatar seed={persona.personaId} className="size-6" />
            <span>{persona.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UniversalSubAgentToolPartDisplay({
  selectedPart,
  studyUserChatToken,
  replay = false,
}: {
  selectedPart: UniversalSubAgentToolPartVM;
  studyUserChatToken?: string;
  replay?: boolean;
}) {
  const toolName = selectedPart.toolName;
  const part = selectedPart.part;

  if (part.state === "output-error") {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-xs">
        {part.errorText}
      </div>
    );
  }

  if (part.type === "dynamic-tool") {
    if (part.state !== "output-available") return null;
    return (
      <div className="rounded-md border p-3 text-sm">
        <Streamdown mode="static">{extractPlainText(part) || "Dynamic tool completed."}</Streamdown>
      </div>
    );
  }

  if (toolName === StudyToolName.interviewChat && studyUserChatToken) {
    const input = part.input as Record<string, unknown> | undefined;
    const researchTopic =
      input && typeof input.instruction === "string" ? input.instruction : undefined;

    return (
      <InterviewExecutionView
        toolInvocation={part as never}
        studyUserChatToken={studyUserChatToken}
        studyUserAvatarSeed={studyUserChatToken}
        replay={replay}
        researchTopic={researchTopic}
        renderToolUIPart={(toolPart) => (
          <StudyToolUIPartDisplay toolUIPart={toolPart as TStudyMessageWithTool["parts"][number]} />
        )}
      />
    );
  }

  if (
    (toolName === StudyToolName.scoutTaskChat || toolName === StudyToolName.scoutSocialTrends) &&
    studyUserChatToken
  ) {
    return (
      <ScoutExecutionView
        toolInvocation={part as never}
        studyUserChatToken={studyUserChatToken}
        replay={replay}
        renderToolUIPart={(toolPart) => (
          <StudyToolUIPartDisplay toolUIPart={toolPart as TStudyMessageWithTool["parts"][number]} />
        )}
      />
    );
  }

  if (part.state !== "output-available") {
    return null;
  }

  if (toolName === StudyToolName.searchPersonas) {
    return <SearchPersonasResultMessage toolInvocation={part as never} />;
  }
  if (toolName === StudyToolName.buildPersona) {
    return <UniversalBuildPersonaResult part={part} />;
  }
  if (toolName === StudyToolName.scoutTaskChat) {
    return <ScoutTaskChatResultMessage toolInvocation={part as never} />;
  }
  if (toolName === StudyToolName.generateReport) {
    return <GenerateReportResultMessage toolInvocation={part as never} />;
  }
  if (toolName === StudyToolName.generatePodcast) {
    return <GeneratePodcastResultMessage toolInvocation={part as never} />;
  }
  if (toolName === StudyToolName.webSearch) {
    return <WebSearchResultMessage toolInvocation={part as never} />;
  }
  if (toolName === StudyToolName.reasoningThinking) {
    return <ReasoningThinkingResultMessage toolInvocation={part as never} />;
  }
  if (SOCIAL_POST_TOOLS.has(toolName)) {
    return <SocialPostsResultMessage toolInvocation={part as never} />;
  }
  if (SOCIAL_COMMENT_TOOLS.has(toolName)) {
    return <SocialPostCommentsResultMessage toolInvocation={part as never} />;
  }

  const plainText = extractPlainText(part);
  if (!plainText) return null;

  return (
    <div className="rounded-md border p-3 text-sm">
      <Streamdown mode="static">{plainText}</Streamdown>
    </div>
  );
}
