"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn, formatDate } from "@/lib/utils";
import { PersonaExtra } from "@/prisma/client";
import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Streamdown } from "streamdown";
import { fetchPersonaPanelById, PersonaWithAttributes } from "../actions";

type PanelData = ExtractServerActionData<typeof fetchPersonaPanelById>;

function getRoleLabel(role: PersonaExtra["role"], t: ReturnType<typeof useTranslations<"PersonaPanel">>) {
  if (role === "consumer") return t("roleType.consumer");
  if (role === "buyer") return t("roleType.buyer");
  return t("roleType.expert");
}

/** Build a compact attribute summary line based on role type */
function buildAttributeSummary(extra: PersonaExtra): string[] {
  const parts: string[] = [];
  if (!extra) return parts;

  // Role-aware: show the most relevant fields first
  if (extra.role === "consumer") {
    if (extra.ageRange) parts.push(extra.ageRange);
    if (extra.location) parts.push(extra.location);
    if (extra.title) parts.push(extra.title);
  } else if (extra.role === "buyer") {
    if (extra.title) parts.push(extra.title);
    if (extra.industry) parts.push(extra.industry);
    if (extra.organization) parts.push(extra.organization);
  } else if (extra.role === "expert") {
    if (extra.title) parts.push(extra.title);
    if (extra.industry) parts.push(extra.industry);
    if (extra.organization) parts.push(extra.organization);
    if (extra.experience) parts.push(extra.experience);
  }

  return parts;
}

function extractSummaryFromPrompt(prompt: string) {
  const match = prompt.match(/<persona>([\s\S]*?)<\/persona>/);
  return match ? match[1] : prompt;
}

export function PanelDetailClient({ panel }: { panel: PanelData }) {
  const t = useTranslations("PersonaPanel");
  const locale = useLocale();
  const [selectedPersona, setSelectedPersona] = useState<PersonaWithAttributes | null>(null);

  return (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-5xl px-6 py-10 space-y-7">
          {/* Header */}
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {panel.title || t("panelId", { id: panel.id })}
            </h1>
            {panel.instruction && (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {panel.instruction}
              </p>
            )}
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{formatDate(panel.createdAt, locale)}</span>
              <span>·</span>
              <span>{t("personaCount", { count: panel.personasWithAttributes.length })}</span>
              <span>·</span>
              <span>
                {t("discussions", { count: panel.usageCount.discussions })}
                {" / "}
                {t("interviews", { count: panel.usageCount.interviews })}
              </span>
            </div>
          </div>

          {/* Personas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {panel.personasWithAttributes.map((persona) => {
              const extra = persona.extra;
              const summaryParts = buildAttributeSummary(extra);

              return (
                <div
                  key={persona.id}
                  className={cn(
                    "group border border-border rounded-lg p-4",
                    "hover:border-green-500/30 transition-all duration-300 cursor-pointer",
                    "flex flex-col gap-2.5",
                  )}
                  onClick={() => setSelectedPersona(persona)}
                >
                  {/* Role badge */}
                  {extra?.role && (
                    <Badge variant="outline" className="self-start text-xs px-2 py-0.5 font-normal text-muted-foreground border-muted-foreground/30">
                      {getRoleLabel(extra.role, t)}
                    </Badge>
                  )}

                  {/* Name */}
                  <div className="text-sm font-medium leading-snug">
                    {persona.name}
                  </div>

                  {/* Attribute summary */}
                  {summaryParts.length > 0 && (
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      {summaryParts.join(" · ")}
                    </div>
                  )}

                  {/* Tags */}
                  {persona.tags && persona.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-auto">
                      {persona.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs text-muted-foreground/70">
                          #{tag}
                        </span>
                      ))}
                      {persona.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground/50">
                          +{persona.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Arrow */}
                  <div className="flex justify-end">
                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Persona Detail Dialog */}
      <Dialog open={!!selectedPersona} onOpenChange={() => setSelectedPersona(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedPersona && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl tracking-tight">
                  {selectedPersona.name}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2.5 text-xs">
                  <span>{selectedPersona.source}</span>
                  <span>·</span>
                  <span>{formatDate(selectedPersona.createdAt, locale)}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Attributes as inline chips */}
                {selectedPersona.extra && Object.keys(selectedPersona.extra).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedPersona.extra.role && (
                      <Badge variant="outline" className="text-xs font-normal border-green-500/30 text-foreground">
                        {getRoleLabel(selectedPersona.extra.role, t)}
                      </Badge>
                    )}
                    {selectedPersona.extra.title && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {selectedPersona.extra.title}
                      </Badge>
                    )}
                    {selectedPersona.extra.ageRange && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {selectedPersona.extra.ageRange}
                      </Badge>
                    )}
                    {selectedPersona.extra.location && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {selectedPersona.extra.location}
                      </Badge>
                    )}
                    {selectedPersona.extra.industry && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {selectedPersona.extra.industry}
                      </Badge>
                    )}
                    {selectedPersona.extra.organization && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {selectedPersona.extra.organization}
                      </Badge>
                    )}
                    {selectedPersona.extra.experience && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {selectedPersona.extra.experience}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Tags */}
                {selectedPersona.tags && selectedPersona.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPersona.tags.map((tag, i) => (
                      <span key={i} className="text-xs text-muted-foreground">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Prompt */}
                <div className="text-xs leading-relaxed p-4 bg-muted/50 rounded-lg border max-h-80 overflow-y-auto">
                  <Streamdown>{extractSummaryFromPrompt(selectedPersona.prompt)}</Streamdown>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
