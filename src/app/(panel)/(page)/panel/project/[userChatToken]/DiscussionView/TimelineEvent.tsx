"use client";
import { DiscussionTimelineEvent } from "@/app/(panel)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Persona } from "@/prisma/client";
import { AtSign, BrainIcon, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Streamdown } from "streamdown";

/** Rotating Tailwind color classes for persona names (600 for light, 400 for dark) */
const PERSONA_COLORS = [
  "text-blue-600 dark:text-blue-400",
  "text-amber-600 dark:text-amber-400",
  "text-teal-600 dark:text-teal-400",
  "text-rose-600 dark:text-rose-400",
  "text-violet-600 dark:text-violet-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-orange-600 dark:text-orange-400",
  "text-cyan-600 dark:text-cyan-400",
  "text-pink-600 dark:text-pink-400",
  "text-indigo-600 dark:text-indigo-400",
];

function getPersonaColor(personaId: number): string {
  return PERSONA_COLORS[personaId % PERSONA_COLORS.length];
}

/** Character threshold for collapsible content */
const COLLAPSE_THRESHOLD = 200;

export type PersonaMapItem = Pick<Persona, "id" | "name" | "token" | "tags" | "extra">;

export function TimelineEvent({
  event,
  index,
  expanded,
  onToggle,
  personaMap,
}: {
  event: DiscussionTimelineEvent;
  index: number;
  expanded: boolean;
  onToggle: (index: number) => void;
  personaMap: Map<number, PersonaMapItem>;
}) {
  const t = useTranslations("PersonaPanel.DiscussionDetailPage");

  // ── Question ──
  if (event.type === "question") {
    return (
      <div className="flex flex-col items-center">
        <div className="w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 px-6 pt-5 pb-7">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="size-1.5 rounded-full bg-ghost-green shadow-[0_0_6px] shadow-ghost-green animate-pulse" />
            <span className="text-base font-semibold text-foreground">{t("atypicaModerator")}</span>
          </div>
          <CollapsibleContent
            content={event.content}
            expanded={expanded}
            onToggle={() => onToggle(index)}
          />
        </div>
      </div>
    );
  }

  // ── Persona Reply ──
  if (event.type === "persona-reply") {
    const persona = personaMap.get(event.personaId);
    const title = persona?.extra?.title;
    const colorClass = getPersonaColor(event.personaId);

    return (
      <div className="flex gap-4">
        {/* Avatar + vertical line */}
        <div className="flex flex-col items-center shrink-0">
          <HippyGhostAvatar seed={event.personaId} className="size-10" />
          <div className="w-px flex-1 mt-2 bg-linear-to-b from-border to-transparent" />
        </div>

        {/* Content */}
        <div className="flex-1 pb-2">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn("text-base font-bold", colorClass)}>{event.personaName}</span>
            {title && (
              <span className="text-[10px] font-medium text-muted-foreground px-1.5 py-0.5 rounded border border-border bg-muted/40">
                {title}
              </span>
            )}
          </div>
          <CollapsibleContent
            content={event.content}
            expanded={expanded}
            onToggle={() => onToggle(index)}
          />
        </div>
      </div>
    );
  }

  // ── Moderator (summary/transition) ──
  if (event.type === "moderator") {
    return (
      <div className="flex flex-col gap-4">
        {/* Separator */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">
            {t("aiModerator")}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
        {/* Summary content */}
        <div className="text-sm text-foreground/90 leading-relaxed px-2">
          <CollapsibleContent
            content={event.content}
            expanded={expanded}
            onToggle={() => onToggle(index)}
            maxLines={8}
          />
        </div>
      </div>
    );
  }

  // ── Moderator Selection ──
  if (event.type === "moderator-selection") {
    return (
      <div className="flex flex-col items-center gap-1.5">
        {/* Divider line with text in the middle */}
        <div className="flex items-center gap-1 w-full">
          <div className="flex-1 h-px bg-border mr-2" />
          <AtSign className="size-3 shrink-0" />
          <span className="text-xs font-semibold shrink-0 mr-1">{event.selectedPersonaName}</span>
          <Button
            variant="link"
            size="sm"
            onClick={() => onToggle(index)}
            className="text-[10px] hover:no-underline has-[>svg]:p-0 text-muted-foreground"
          >
            <BrainIcon className="size-3" /> {expanded ? t("collapseReason") : t("viewReason")}
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>
          <div className="flex-1 h-px bg-border ml-2" />
        </div>
        {event.reasoning && (
          <div className="self-stretch text-center">
            {expanded && (
              <p className="mt-1 text-xs text-muted-foreground/60 leading-relaxed text-left">
                {event.reasoning}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// CollapsibleContent — text that collapses when too long
// ─────────────────────────────────────────────────────────────

function CollapsibleContent({
  content,
  expanded,
  onToggle,
  maxLines = 4,
}: {
  content: string;
  expanded: boolean;
  onToggle: () => void;
  maxLines?: number;
}) {
  const t = useTranslations("PersonaPanel.DiscussionDetailPage");
  const isLong = content.length > COLLAPSE_THRESHOLD;
  const shouldCollapse = isLong && !expanded;

  const clampClass =
    maxLines === 4
      ? "line-clamp-4"
      : maxLines === 8
        ? "line-clamp-[8]"
        : `line-clamp-[${maxLines}]`;

  return (
    <div>
      <div
        className={cn("text-sm text-foreground/90 leading-relaxed", shouldCollapse && clampClass)}
      >
        <Streamdown mode="static">{content}</Streamdown>
      </div>
      {isLong && (
        <button
          onClick={onToggle}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3" />
              {t("collapse")}
            </>
          ) : (
            <>
              <ChevronDown className="size-3" />
              {t("expand")}
            </>
          )}
        </button>
      )}
    </div>
  );
}
