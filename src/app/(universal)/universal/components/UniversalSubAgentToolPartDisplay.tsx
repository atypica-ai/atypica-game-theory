"use client";

import { fetchAnalystReportByToken } from "@/app/(study)/study/actions";
import { ReasoningThinkingResultMessage } from "@/ai/tools/experts/reasoningThinking/ReasoningThinkingResultMessage";
import { WebSearchResultMessage } from "@/ai/tools/experts/webSearch/WebSearchResultMessage";
import {
  SocialPostCommentsResultMessage,
  SocialPostsResultMessage,
} from "@/ai/tools/social/ToolMessage";
import { GeneratePodcastResultMessage } from "@/app/(study)/tools/generatePodcast/GeneratePodcastResultMessage";
import { GenerateReportResultMessage } from "@/app/(study)/tools/generateReport/GenerateReportResultMessage";
import { InterviewChatExecutionView } from "@/app/(study)/tools/interviewChat/InterviewChatExecutionView";
import { ScoutTaskChatExecutionView } from "@/app/(study)/tools/scoutTaskChat/ScoutTaskChatExecutionView";
import { ScoutTaskChatResultMessage } from "@/app/(study)/tools/scoutTaskChat/ScoutTaskChatResultMessage";
import { SearchPersonasResultMessage } from "@/app/(study)/tools/searchPersonas/SearchPersonasResultMessage";
import { StudyToolName, StudyUITools } from "@/app/(study)/tools/types";
import { StudyToolUIPartDisplay } from "@/app/(study)/tools/ui";
import { UniversalSubAgentToolPartVM } from "@/app/(universal)/universal/task-vm";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { cn } from "@/lib/utils";
import { ToolUIPart } from "ai";
import { Eye, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Streamdown } from "streamdown";
import { useCallback, useEffect, useRef, useState } from "react";

// Narrow type aliases derived from the study tool union — no casts needed downstream.
type SocialPostToolName =
  | typeof StudyToolName.xhsSearch
  | typeof StudyToolName.dySearch
  | typeof StudyToolName.tiktokSearch
  | typeof StudyToolName.insSearch
  | typeof StudyToolName.xhsUserNotes
  | typeof StudyToolName.dyUserPosts
  | typeof StudyToolName.tiktokUserPosts
  | typeof StudyToolName.insUserPosts
  | typeof StudyToolName.twitterSearch
  | typeof StudyToolName.twitterUserPosts;

type SocialCommentToolName =
  | typeof StudyToolName.xhsNoteComments
  | typeof StudyToolName.dyPostComments
  | typeof StudyToolName.tiktokPostComments
  | typeof StudyToolName.insPostComments
  | typeof StudyToolName.twitterPostComments;

type SocialPostPart = Extract<ToolUIPart<StudyUITools>, { type: `tool-${SocialPostToolName}` }>;
type SocialCommentPart = Extract<ToolUIPart<StudyUITools>, { type: `tool-${SocialCommentToolName}` }>;

const SOCIAL_POST_TOOL_TYPES = new Set<string>([
  `tool-${StudyToolName.xhsSearch}`,
  `tool-${StudyToolName.dySearch}`,
  `tool-${StudyToolName.tiktokSearch}`,
  `tool-${StudyToolName.insSearch}`,
  `tool-${StudyToolName.xhsUserNotes}`,
  `tool-${StudyToolName.dyUserPosts}`,
  `tool-${StudyToolName.tiktokUserPosts}`,
  `tool-${StudyToolName.insUserPosts}`,
  `tool-${StudyToolName.twitterSearch}`,
  `tool-${StudyToolName.twitterUserPosts}`,
]);

const SOCIAL_COMMENT_TOOL_TYPES = new Set<string>([
  `tool-${StudyToolName.xhsNoteComments}`,
  `tool-${StudyToolName.dyPostComments}`,
  `tool-${StudyToolName.tiktokPostComments}`,
  `tool-${StudyToolName.insPostComments}`,
  `tool-${StudyToolName.twitterPostComments}`,
]);

function isSocialPostPart(part: ToolUIPart<StudyUITools>): part is SocialPostPart {
  return SOCIAL_POST_TOOL_TYPES.has(part.type);
}
function isSocialCommentPart(part: ToolUIPart<StudyUITools>): part is SocialCommentPart {
  return SOCIAL_COMMENT_TOOL_TYPES.has(part.type);
}

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

function extractReportToken(part: UniversalSubAgentToolPartVM["part"]): string | null {
  if (part.type === "dynamic-tool") return null;
  const outputToken =
    part.output && typeof part.output === "object" && "reportToken" in part.output
      ? (part.output as { reportToken?: unknown }).reportToken
      : undefined;
  if (typeof outputToken === "string" && outputToken) return outputToken;

  const inputToken =
    part.input && typeof part.input === "object" && "reportToken" in part.input
      ? (part.input as { reportToken?: unknown }).reportToken
      : undefined;
  return typeof inputToken === "string" && inputToken ? inputToken : null;
}

function UniversalGenerateReportExecutionView({
  part,
}: {
  part: UniversalSubAgentToolPartVM["part"];
}) {
  const t = useTranslations("UniversalAgent");
  const reportToken = extractReportToken(part);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(100);
  const [iframeHeight, setIframeHeight] = useState(1200);
  const [report, setReport] = useState<{
    token: string;
    generatedAt: Date | string | null;
  } | null>(reportToken ? { token: reportToken, generatedAt: null } : null);

  const updateDimensions = useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth;
    const containerHeight = containerRef.current?.clientHeight;
    const nextRatio = Math.max(22, Math.floor((containerWidth ? containerWidth / 1200 : 1) * 100));
    setRatio(nextRatio);
    setIframeHeight(containerHeight ? Math.floor((containerHeight / nextRatio) * 100) : 1200);
  }, []);

  useEffect(() => {
    updateDimensions();
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener("resize", updateDimensions);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, [updateDimensions]);

  useEffect(() => {
    if (!reportToken) {
      setReport(null);
      return;
    }

    let cancelled = false;
    fetchAnalystReportByToken(reportToken)
      .then((result) => {
        if (!result.success || cancelled) return;
        setReport({
          token: result.data.token,
          generatedAt: result.data.generatedAt,
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [part.state, reportToken]);

  if (!reportToken) {
    return (
      <div className="rounded-xl border border-amber-300/40 bg-amber-500/5 p-4 text-sm text-muted-foreground">
        {t("executionReportPreparing")}
      </div>
    );
  }

  const isGenerated = !!report?.generatedAt;

  return (
    <div className="space-y-3 rounded-2xl border border-amber-300/35 bg-[linear-gradient(180deg,rgba(251,191,36,0.08)_0%,rgba(251,191,36,0.02)_100%)] p-3">
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
            isGenerated
              ? "border-emerald-300/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-amber-300/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
          )}
        >
          {isGenerated ? <Eye className="size-3.5" /> : <Loader2 className="size-3.5 animate-spin" />}
          {isGenerated ? t("executionReportPreviewReady") : t("executionReportGenerating")}
        </span>
        <a
          href={`/artifacts/report/${reportToken}/share`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-foreground/85 transition-colors hover:bg-muted"
        >
          <Eye className="size-3.5" />
          {t("executionReportOpenPreview")}
        </a>
      </div>

      <div className="rounded-[20px] border border-border/60 bg-background/90 p-3">
        <div ref={containerRef} className="h-[340px] overflow-hidden rounded-[14px] border border-border/50 bg-muted/20">
          <iframe
            src={`/artifacts/report/${reportToken}/raw?live=1`}
            className="w-[1200px] border-0 bg-background"
            style={{
              transform: `scale(${ratio / 100})`,
              transformOrigin: "top left",
              height: iframeHeight,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function UniversalBuildPersonaResult({ part }: { part: UniversalSubAgentToolPartVM["part"] }) {
  const t = useTranslations("UniversalAgent");
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
    return <div className="text-sm text-muted-foreground">{t("taskNoPersonaBuilt")}</div>;
  }

  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-sm">
      <div className="font-medium mb-2">{t("taskPersonasBuilt", { count: personas.length })}</div>
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
  polling = true,
}: {
  selectedPart: UniversalSubAgentToolPartVM;
  studyUserChatToken?: string;
  polling?: boolean;
}) {
  const part = selectedPart.part;

  const renderToolUIPart = useCallback(
    (toolPart: Parameters<typeof StudyToolUIPartDisplay>[0]["toolUIPart"]) => (
      <StudyToolUIPartDisplay toolUIPart={toolPart} />
    ),
    [],
  );

  if (part.state === "output-error") {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-xs">
        {part.errorText}
      </div>
    );
  }

  // Dynamic (MCP) tool — handle separately since it has a different output shape.
  if (part.type === "dynamic-tool") {
    if (part.state !== "output-available") return null;
    return (
      <div className="rounded-md border p-3 text-sm">
        <Streamdown mode="static">{extractPlainText(part) || "Dynamic tool completed."}</Streamdown>
      </div>
    );
  }

  // From here, part: ToolUIPart<StudyUITools>. Checking part.type gives fully-typed narrowing.

  if (part.type === `tool-${StudyToolName.interviewChat}` && studyUserChatToken) {
    return (
      <InterviewChatExecutionView
        toolInvocation={part}
        studyUserChatToken={studyUserChatToken}
        studyUserAvatarSeed={studyUserChatToken}
        polling={polling}
        researchTopic={part.input?.instruction}
        renderToolUIPart={renderToolUIPart}
      />
    );
  }

  if (
    (part.type === `tool-${StudyToolName.scoutTaskChat}` ||
      part.type === `tool-${StudyToolName.scoutSocialTrends}`) &&
    studyUserChatToken
  ) {
    return (
      <ScoutTaskChatExecutionView
        toolInvocation={part}
        studyUserChatToken={studyUserChatToken}
        polling={polling}
        renderToolUIPart={renderToolUIPart}
      />
    );
  }

  if (part.state !== "output-available") {
    return null;
  }

  if (part.type === `tool-${StudyToolName.searchPersonas}`) {
    return <SearchPersonasResultMessage toolInvocation={part} />;
  }
  if (part.type === `tool-${StudyToolName.buildPersona}`) {
    return <UniversalBuildPersonaResult part={part} />;
  }
  if (part.type === `tool-${StudyToolName.scoutTaskChat}`) {
    return <ScoutTaskChatResultMessage toolInvocation={part} />;
  }
  if (part.type === `tool-${StudyToolName.generateReport}`) {
    return (
      <div className="space-y-3">
        <UniversalGenerateReportExecutionView part={part} />
        <GenerateReportResultMessage toolInvocation={part} />
      </div>
    );
  }
  if (part.type === `tool-${StudyToolName.generatePodcast}`) {
    return <GeneratePodcastResultMessage toolInvocation={part} />;
  }
  if (part.type === `tool-${StudyToolName.webSearch}`) {
    return <WebSearchResultMessage toolInvocation={part} />;
  }
  if (part.type === `tool-${StudyToolName.reasoningThinking}`) {
    return <ReasoningThinkingResultMessage toolInvocation={part} />;
  }
  if (isSocialPostPart(part)) {
    return <SocialPostsResultMessage toolInvocation={part} />;
  }
  if (isSocialCommentPart(part)) {
    return <SocialPostCommentsResultMessage toolInvocation={part} />;
  }

  const plainText = extractPlainText(part);
  if (!plainText) return null;

  return (
    <div className="rounded-md border p-3 text-sm">
      <Streamdown mode="static">{plainText}</Streamdown>
    </div>
  );
}
