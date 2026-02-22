"use client";

import {
  TUniversalMessageWithTool,
  UniversalToolName,
} from "@/app/(universal)/tools/types";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

type UpdatePanelToolUIPart = Extract<
  TUniversalMessageWithTool["parts"][number],
  { type: `tool-${typeof UniversalToolName.updatePanel}` }
>;

export function UpdatePanelResultMessage({
  toolInvocation,
}: {
  toolInvocation: UpdatePanelToolUIPart;
}) {
  const t = useTranslations("PersonaPanel.CreatePanelTool");

  if (toolInvocation.state !== "output-available") {
    return null;
  }

  const output = toolInvocation.output;

  return (
    <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
      <div className="flex items-center gap-2 text-sm">
        <CheckIcon className="size-4 text-green-600 shrink-0" />
        <span className="flex-1">
          {t("panelUpdated", { title: output.title, count: output.personaIds.length })}
        </span>
        <Link
          href={`/panel/${output.panelId}`}
          className="text-xs text-foreground/70 hover:text-foreground underline underline-offset-2 shrink-0"
        >
          {t("viewPanel")}
        </Link>
      </div>
    </div>
  );
}
