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
import { InterviewExecutionView } from "@/app/(study)/study/console/shared/InterviewExecutionView";
import { ScoutExecutionView } from "@/app/(study)/study/console/shared/ScoutExecutionView";
import { ScoutTaskChatResultMessage } from "@/app/(study)/tools/scoutTaskChat/ScoutTaskChatResultMessage";
import { SearchPersonasResultMessage } from "@/app/(study)/tools/searchPersonas/SearchPersonasResultMessage";
import { StudyToolName, TStudyMessageWithTool } from "@/app/(study)/tools/types";
import { StudyToolUIPartDisplay } from "@/app/(study)/tools/ui";
import { UniversalSubAgentToolPartVM } from "@/app/(universal)/universal/task-vm";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { cn } from "@/lib/utils";
import { Eye, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Streamdown } from "streamdown";
import { useCallback, useEffect, useRef, useState } from "react";

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
    if (part.state !== "output-available") {
      return <UniversalGenerateReportExecutionView part={part} />;
    }
    return (
      <div className="space-y-3">
        <UniversalGenerateReportExecutionView part={part} />
        <GenerateReportResultMessage toolInvocation={part as never} />
      </div>
    );
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
