"use client";

import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { PersonaExtra } from "@/prisma/client";
import { useLocale, useTranslations } from "next-intl";
import { Streamdown } from "streamdown";
import type { PersonaPanelWithDetails } from "./actions";

type PersonaData = PersonaPanelWithDetails["personas"][number];

function extractSummaryFromPrompt(prompt: string) {
  const match = prompt.match(/<persona>([\s\S]*?)<\/persona>/);
  return match ? match[1] : prompt;
}

export function getTierLabel(tier: number) {
  if (tier >= 2) return "T2";
  if (tier >= 1) return "T1";
  return "T0";
}

/** Compact inline summary for card usage */
export function buildExtraSummary(extra: PersonaExtra): string {
  if (!extra) return "";
  const fields: string[] = [];

  if (extra.role === "consumer") {
    if (extra.ageRange) fields.push(extra.ageRange);
    if (extra.location) fields.push(extra.location);
    if (extra.title) fields.push(extra.title);
  } else if (extra.role === "buyer") {
    if (extra.title) fields.push(extra.title);
    if (extra.industry) fields.push(extra.industry);
    if (extra.organization) fields.push(extra.organization);
  } else if (extra.role === "expert") {
    if (extra.title) fields.push(extra.title);
    if (extra.industry) fields.push(extra.industry);
    if (extra.organization) fields.push(extra.organization);
    if (extra.experience) fields.push(extra.experience);
  }

  return fields.join(" · ");
}

interface PersonaDetailDialogProps {
  persona: PersonaData | null;
  onOpenChange: (open: boolean) => void;
}

export function PersonaDetailDialog({ persona, onOpenChange }: PersonaDetailDialogProps) {
  const t = useTranslations("PersonaPanel.DetailPage.attributes");
  const locale = useLocale();

  const extra = persona?.extra;

  // Build attribute fields inline
  const fields: Array<{ label: string; value: string }> = [];
  if (extra) {
    if (extra.role === "consumer") {
      if (extra.ageRange) fields.push({ label: t("ageRange"), value: extra.ageRange });
      if (extra.location) fields.push({ label: t("location"), value: extra.location });
      if (extra.title) fields.push({ label: t("title"), value: extra.title });
    } else if (extra.role === "buyer") {
      if (extra.title) fields.push({ label: t("title"), value: extra.title });
      if (extra.industry) fields.push({ label: t("industry"), value: extra.industry });
      if (extra.organization) fields.push({ label: t("organization"), value: extra.organization });
    } else if (extra.role === "expert") {
      if (extra.title) fields.push({ label: t("title"), value: extra.title });
      if (extra.industry) fields.push({ label: t("industry"), value: extra.industry });
      if (extra.organization) fields.push({ label: t("organization"), value: extra.organization });
      if (extra.experience) fields.push({ label: t("experience"), value: extra.experience });
    }
  }

  const roleLabel = extra?.role
    ? extra.role === "consumer"
      ? t("roleType.consumer")
      : extra.role === "buyer"
        ? t("roleType.buyer")
        : t("roleType.expert")
    : null;

  return (
    <Dialog open={!!persona} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        {persona && (
          <>
            <DialogHeader>
              <div className="flex items-start gap-4">
                <HippyGhostAvatar
                  seed={persona.id}
                  className="size-14 rounded-xl shrink-0 bg-muted/50"
                />
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-xl tracking-tight">{persona.name}</DialogTitle>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    {roleLabel && (
                      <>
                        <Badge variant="secondary" className="text-xs h-5 px-1.5 font-normal">
                          {roleLabel}
                        </Badge>
                        <span>·</span>
                      </>
                    )}
                    {persona.source && (
                      <>
                        <span>{persona.source}</span>
                        <span>·</span>
                      </>
                    )}
                    <Badge variant="outline" className="text-xs h-4 px-1.5 font-normal">
                      {getTierLabel(persona.tier)}
                    </Badge>
                    <span>·</span>
                    <span>{formatDate(persona.createdAt, locale)}</span>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5 mt-4">
              {/* Attributes grid */}
              {fields.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium mb-3">
                    {t("heading")}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {fields.map(({ label, value }) => (
                      <div key={label} className="space-y-0.5">
                        <div className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">
                          {label}
                        </div>
                        <div className="text-sm">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {persona.tags && persona.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {persona.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Persona Profile */}
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">
                  {t("description")}
                </div>
                <div className="text-xs leading-relaxed p-4 bg-muted/30 rounded-lg border max-h-72 overflow-y-auto">
                  <Streamdown mode="static">{extractSummaryFromPrompt(persona.prompt)}</Streamdown>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
