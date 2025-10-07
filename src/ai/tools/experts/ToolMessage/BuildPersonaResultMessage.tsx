import { StudyUITools, ToolName } from "@/ai/tools/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { ToolUIPart } from "ai";
import { useTranslations } from "next-intl";

import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { Button } from "@/components/ui/button";

export const BuildPersonaResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<
    ToolUIPart<Pick<StudyUITools, ToolName.buildPersona>>,
    { state: "output-available" }
  >;
}) => {
  const t = useTranslations("Components.BuildPersonaResultMessage");
  const { setViewToolInvocation, setConsoleOpen } = useStudyContext();
  const { personas } = toolInvocation.output;
  if (!personas?.length) {
    return <div className="text-sm text-muted-foreground">No persona built</div>;
  }
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-sm">
      <div className="font-medium mb-2 flex items-center gap-2">
        <div>🤖 {t("personaCreated", { count: personas.length })}</div>
        <Button
          variant="outline"
          size="sm"
          className="px-2 h-6 text-xs"
          onClick={() => {
            setViewToolInvocation(toolInvocation);
            setConsoleOpen(true);
          }}
        >
          {t("viewDetails")}
        </Button>
      </div>
      <div className="space-y-1">
        {personas.map(({ personaId, name }) => (
          <div className="flex items-center gap-2" key={personaId}>
            <HippyGhostAvatar seed={personaId} className="size-6" />
            {name}
          </div>
        ))}
      </div>
    </div>
  );
};
