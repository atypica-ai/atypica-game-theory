"use client";

import { FitToViewport } from "@/components/layout/FitToViewport";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { fetchPersonaPanelById } from "./actions";
import { PanelPersonaList } from "./PanelPersonaList";
import { PanelSidebar } from "./PanelSidebar";

type PanelData = ExtractServerActionData<typeof fetchPersonaPanelById>;

export function PanelDetailClient({ panel }: { panel: PanelData }) {
  const t = useTranslations("PersonaPanel");
  const locale = useLocale();

  return (
    <FitToViewport>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 mx-auto w-full max-w-7xl px-6 py-8 flex flex-row gap-8 overflow-hidden">
          {/* Left — header + personas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header — fixed */}
            <div className="shrink-0 pb-6">
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
                <span>{t("personaCount", { count: panel.personas.length })}</span>
                <span>·</span>
                <span>
                  {t("discussions", { count: panel.usageCount.discussions })}
                  {" / "}
                  {t("interviews", { count: panel.usageCount.interviews })}
                </span>
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
