"use client";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PersonaExtra } from "@/prisma/client";
import { useTranslations } from "next-intl";
import { Streamdown } from "streamdown";
import type { PersonaPanelWithDetails } from "./actions";

type PersonaData = PersonaPanelWithDetails["personas"][number];

/** Extract full prompt, unwrap <persona> tags if present */
function extractFullPrompt(prompt: string): string {
  const match = prompt.match(/<persona>([\s\S]*?)<\/persona>/);
  return match ? match[1].trim() : prompt;
}

export function getTierLabel(tier: number) {
  if (tier >= 2) return "T2";
  if (tier >= 1) return "T1";
  return "T0";
}

/** Build inline summary for card display */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildExtraSummary(extra: PersonaExtra): string {
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
  const t = useTranslations("PersonaPanel.DetailPage");

  if (!persona) return null;

  const extra = persona.extra;

  // Build all attribute fields (exclude title - shown in header)
  const fields: Array<{ label: string; value: string }> = [];
  if (extra) {
    if (extra.ageRange) fields.push({ label: t("attributes.ageRange"), value: extra.ageRange });
    if (extra.location) fields.push({ label: t("attributes.location"), value: extra.location });
    if (extra.industry) fields.push({ label: t("attributes.industry"), value: extra.industry });
    if (extra.organization)
      fields.push({ label: t("attributes.organization"), value: extra.organization });
    if (extra.experience)
      fields.push({ label: t("attributes.experience"), value: extra.experience });
    // title excluded - already in header
  }

  const fullPrompt = extractFullPrompt(persona.prompt);

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-thin p-8 space-y-6">
          {/* Header: avatar + name + title + tier */}
          <div className="flex items-start gap-4">
            <HippyGhostAvatar
              seed={persona.id}
              className="size-14 rounded-xl shrink-0 bg-muted/50"
            />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {persona.name}
              </DialogTitle>
              {extra?.title && <p className="text-sm text-muted-foreground mt-1">{extra.title}</p>}
            </div>
            <Badge variant="outline" className="text-xs h-5 px-2 font-normal shrink-0">
              {getTierLabel(persona.tier)}
            </Badge>
          </div>

          {/* Quote: first-person statement */}
          {extra?.quote && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm italic leading-relaxed line-clamp-3">{extra.quote}</p>
            </div>
          )}

          {/* Combined section: attributes + tags */}
          {(fields.length > 0 || (persona.tags && persona.tags.length > 0)) && (
            <div className="space-y-4">
              {fields.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {fields.map(({ label, value }) => (
                    <div key={label} className="space-y-1">
                      <div className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">
                        {label}
                      </div>
                      <div className="text-sm">{value}</div>
                    </div>
                  ))}
                </div>
              )}

              {persona.tags && persona.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {persona.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Source note */}
          {persona.source && (
            <div className="rounded-lg border bg-muted px-4 py-2.5">
              <p className="text-xs text-muted-foreground">
                {t("sourceNote", { source: persona.source })}
              </p>
            </div>
          )}

          {/* Full prompt as prose */}
          <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
            <Streamdown mode="static">{fullPrompt}</Streamdown>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
