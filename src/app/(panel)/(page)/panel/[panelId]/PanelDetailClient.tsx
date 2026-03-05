"use client";

import { Badge } from "@/components/ui/badge";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { ExtractServerActionData } from "@/lib/serverAction";
import { useTranslations } from "next-intl";
import { fetchPersonaPanelById } from "./actions";
import { PanelPersonaList } from "./PanelPersonaList";
import { PanelSidebar } from "./PanelSidebar";

type PanelData = ExtractServerActionData<typeof fetchPersonaPanelById>;

function getPrimaryRole(personas: PanelData["personas"]) {
  const roleCount = personas.reduce(
    (acc, p) => {
      const role = p.extra?.role;
      if (role) acc[role] = (acc[role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const primaryRole = Object.entries(roleCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  return primaryRole as "consumer" | "buyer" | "expert" | undefined;
}

function getRoleLabel(role: "consumer" | "buyer" | "expert" | undefined) {
  if (!role) return null;
  const labels = {
    consumer: "Consumer",
    buyer: "Buyer",
    expert: "Expert",
  };
  return labels[role];
}

export function PanelDetailClient({ panel }: { panel: PanelData }) {
  const t = useTranslations("PersonaPanel");
  const primaryRole = getPrimaryRole(panel.personas);
  const roleLabel = getRoleLabel(primaryRole);

  return (
    <FitToViewport>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 mx-auto w-full max-w-7xl px-6 py-8 flex flex-row gap-8 overflow-hidden">
          {/* Left — header + personas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header — fixed */}
            <div className="shrink-0 pb-6">
              <div className="rounded-2xl border border-border bg-card p-6">
                {/* Top: Title + Panel ID | Role Badge */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                      {panel.title || t("panelId", { id: panel.id })}
                    </h1>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                      Panel ID: {panel.id}
                    </p>
                  </div>
                  {roleLabel && (
                    <Badge variant="outline" className="shrink-0 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-ghost-green" />
                      {roleLabel}
                    </Badge>
                  )}
                </div>

                {/* Divider + Details */}
                <div className="mt-4 border-t border-border pt-4 space-y-3">
                  {panel.instruction && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {panel.instruction}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{t("personaCount", { count: panel.personas.length })}</span>
                    <span>·</span>
                    <span>{t("discussions", { count: panel.usageCount.discussions })}</span>
                    <span>·</span>
                    <span>{t("interviews", { count: panel.usageCount.interviews })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Personas — scrollable */}
            <div className="flex-1 overflow-y-auto">
              <PanelPersonaList
                panelId={panel.id}
                personaIds={panel.personaIds}
                personas={panel.personas}
              />
            </div>
          </div>

          {/* Right — sidebar */}
          <div className="w-80 shrink-0 border-l border-border pl-8 flex flex-col overflow-hidden">
            <PanelSidebar
              panelId={panel.id}
              personas={panel.personas.map((p) => ({ id: p.id, name: p.name }))}
            />
          </div>
        </div>
      </div>
    </FitToViewport>
  );
}
