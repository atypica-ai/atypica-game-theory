import { BuildPersonaToolResult } from "@/ai/tools/experts/buildPersona";
import { ToolInvocation } from "ai";
import { useTranslations } from "next-intl";
import { FC } from "react";
import { PersonaGrids } from "./PersonaGrids";

export const SearchPersonasConsole: FC<{
  toolInvocation: ToolInvocation;
}> = ({ toolInvocation }) => {
  const t = useTranslations("StudyPage.ToolConsole");

  if (toolInvocation.state !== "result") {
    return (
      <div className="flex gap-2">
        <div className="text-sm">{t("buildingPersona")}</div>
        <div className="flex gap-1">
          <span className="animate-bounce">·</span>
          <span className="animate-bounce [animation-delay:0.2s]">·</span>
          <span className="animate-bounce [animation-delay:0.4s]">·</span>
        </div>
      </div>
    );
  }

  const { personas } = toolInvocation.result as BuildPersonaToolResult;

  return (
    <div className="py-2">
      <h3 className="text-sm mb-4">🤖 {t("searchPersonasResult", { count: personas.length })}</h3>
      <PersonaGrids personas={personas} />
    </div>
  );
};
