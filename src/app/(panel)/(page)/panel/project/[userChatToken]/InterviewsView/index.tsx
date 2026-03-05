"use client";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { CollapsibleText } from "@/app/(panel)/components/CollapsibleText";
import { cn } from "@/lib/utils";
import type { PersonaExtra } from "@/prisma/client";
import { ArrowLeft, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import useSWR from "swr";
import { fetchBatchInterviewsDetail, fetchInterviewMessages } from "../actions";
import { InterviewSidebar } from "./InterviewSidebar";

export function InterviewsView({
  panel,
  project,
  personaIds,
  selector,
}: {
  panel: { id: number; title: string };
  project: { token: string; title: string };
  personaIds: number[];
  selector?: {
    items: { label: string }[];
    selectedIndex: number;
    onSelect: (index: number) => void;
  };
}) {
  const t = useTranslations("PersonaPanel.InterviewsPage");

  // Fetch interview detail (personas + interview status) by panelId + personaIds
  const { data: interviewDetail } = useSWR(
    personaIds.length > 0 ? ["panel:batchInterviews", panel.id, personaIds] : null,
    async () => {
      const result = await fetchBatchInterviewsDetail({
        panelId: panel.id,
        personaIds,
      });
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    {
      refreshInterval: (data) => {
        const hasRunning = data?.interviews.some((i) => i.status === "in-progress");
        const hasPending = data?.interviews.some((i) => i.status === "pending");
        return hasRunning || hasPending ? 5000 : 0;
      },
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const interviews = useMemo(() => interviewDetail?.interviews ?? [], [interviewDetail?.interviews]);
  const personas = useMemo(() => interviewDetail?.personas ?? [], [interviewDetail?.personas]);

  // Build persona lookup map
  const personaMap = useMemo(() => {
    const map = new Map<number, { id: number; name: string; extra: PersonaExtra }>();
    for (const p of personas) {
      map.set(p.id, p);
    }
    return map;
  }, [personas]);

  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);

  // Auto-select first persona when data loads
  useEffect(() => {
    if (interviews.length === 0) return;
    const selected = interviews.find((i) => i.personaId === selectedPersonaId);
    if (selected) return;
    setSelectedPersonaId(interviews[0].personaId);
  }, [interviews, selectedPersonaId]);

  const selectedInterview = interviews.find((i) => i.personaId === selectedPersonaId) ?? null;
  const isComplete = selectedInterview?.status === "completed";
  const completedCount = interviews.filter((i) => i.status === "completed").length;

  if (personaIds.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("noInterviews")}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Persona list */}
      <div className="hidden md:flex flex-col w-48 lg:w-56 border-r border-border py-4 px-4 gap-5">
        {/* Research item selector */}
        {selector && (
          <Select
            value={String(selector.selectedIndex)}
            onValueChange={(value) => selector.onSelect(Number(value))}
          >
            <SelectTrigger size="sm" className="w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selector.items.map((item, index) => (
                <SelectItem key={index} value={String(index)} className="text-xs">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground">
            {completedCount}/{interviews.length} {t("completed")}
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-700"
              style={{
                width: `${interviews.length > 0 ? (completedCount / interviews.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Persona list — clickable */}
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1">
          {interviews.map((interview) => {
            const isSelected = selectedPersonaId === interview.personaId;
            const persona = personaMap.get(interview.personaId);
            const title = persona?.extra?.title;
            return (
              <button
                key={interview.personaId}
                onClick={() => setSelectedPersonaId(interview.personaId)}
                className={cn(
                  "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-left transition-colors",
                  isSelected ? "bg-muted/60" : "hover:bg-muted/30",
                  interview.status === "pending" && !isSelected && "opacity-40",
                )}
              >
                <HippyGhostAvatar seed={interview.personaId} className="size-7 shrink-0" />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate text-xs font-medium">{interview.personaName}</span>
                  {title && (
                    <span className="truncate text-[10px] text-muted-foreground">{title}</span>
                  )}
                </div>
                {interview.status === "completed" ? (
                  <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
                ) : interview.status === "in-progress" ? (
                  <Loader2 className="size-3.5 text-amber-500 animate-spin shrink-0" />
                ) : (
                  <Circle className="size-3.5 text-muted-foreground/30 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Center: Interview messages */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Floating header bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center px-4 lg:px-6 py-3 bg-background/60 backdrop-blur-sm">
          {/* Left 25% */}
          <div className="w-1/4 min-w-0">
            <Link
              href={`/panel/${panel.id}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 truncate"
            >
              <ArrowLeft className="size-3 shrink-0" />
              <span className="truncate">{panel.title}</span>
            </Link>
          </div>

          {/* Center 50% */}
          <div className="w-1/2 text-center min-w-0">
            <h1 className="text-sm font-medium truncate">{project.title}</h1>
          </div>

          {/* Right 25% */}
          <div className="w-1/4 min-w-0 flex justify-end">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-md border border-border/50 bg-background/40">
              <div
                className={
                  isComplete
                    ? "size-2 rounded-full bg-muted-foreground/30"
                    : "size-2 rounded-full bg-ghost-green shadow-[0_0_6px] shadow-ghost-green animate-pulse"
                }
              />
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {isComplete ? t("completed") : t("inProgress")}
              </span>
            </div>
          </div>
        </div>

        {selectedInterview?.interviewUserChatToken ? (
          <InterviewMessages
            interviewUserChatToken={selectedInterview.interviewUserChatToken}
            personaId={selectedInterview.personaId}
            personaName={selectedInterview.personaName}
            personaTitle={personaMap.get(selectedInterview.personaId)?.extra?.title}
            isRunning={selectedInterview.status === "in-progress"}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            {t("selectInterview")}
          </div>
        )}
      </div>

      {/* Right: Sidebar */}
      <InterviewSidebar
        conclusion={selectedInterview?.conclusion ?? ""}
        isComplete={isComplete}
        projectToken={project.token}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// InterviewMessages — renders the chat messages for one interview
// ─────────────────────────────────────────────────────────────

function InterviewMessages({
  interviewUserChatToken,
  personaId,
  personaName,
  personaTitle,
  isRunning,
}: {
  interviewUserChatToken: string;
  personaId: number;
  personaName: string;
  personaTitle?: string;
  isRunning: boolean;
}) {
  const t = useTranslations("PersonaPanel.InterviewsPage");

  const { data: messages = [], isLoading } = useSWR(
    ["panel:interviewMessages", interviewUserChatToken],
    async () => {
      const result = await fetchInterviewMessages({ interviewUserChatToken });
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    {
      refreshInterval: isRunning ? 5000 : 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto scrollbar-thin pt-16 pb-6 lg:pb-10"
    >
      <div className="max-w-4xl mx-auto px-4 lg:px-6 space-y-12">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center min-h-[50vh]">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("loading")}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-[50vh]">
            <div className="text-sm text-muted-foreground">{t("noMessages")}</div>
          </div>
        ) : (
          messages.map((message) => {
            const isInterviewer = message.role === "user";
            const textParts = message.parts.filter(
              (p): p is { type: "text"; text: string } => p.type === "text",
            );
            if (textParts.length === 0) return null;

            const content = textParts.map((p) => p.text).join("\n");

            if (isInterviewer) {
              return (
                <div key={message.id} className="flex flex-col items-center">
                  <div className="w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 px-6 pt-5 pb-7">
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <span className="size-1.5 rounded-full bg-ghost-green shadow-[0_0_6px] shadow-ghost-green animate-pulse" />
                      <span className="text-base font-semibold text-foreground">
                        {t("interviewer")}
                      </span>
                    </div>
                    <CollapsibleText text={content} className="text-sm text-foreground/90 leading-relaxed">
                      <Streamdown mode="static">{content}</Streamdown>
                    </CollapsibleText>
                  </div>
                </div>
              );
            }

            return (
              <div key={message.id} className="flex gap-4">
                <div className="flex flex-col items-center shrink-0">
                  <HippyGhostAvatar seed={personaId} className="size-10" />
                  <div className="w-px flex-1 mt-2 bg-linear-to-b from-border to-transparent" />
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base font-bold">{personaName}</span>
                    {personaTitle && (
                      <span className="text-[10px] font-medium text-muted-foreground px-1.5 py-0.5 rounded border border-border bg-muted/40">
                        {personaTitle}
                      </span>
                    )}
                  </div>
                  <CollapsibleText text={content} className="text-sm text-foreground/90 leading-relaxed">
                    <Streamdown mode="static">{content}</Streamdown>
                  </CollapsibleText>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
