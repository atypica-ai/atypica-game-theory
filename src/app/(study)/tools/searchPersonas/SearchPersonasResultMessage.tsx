import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { StudyToolName, StudyUITools } from "@/app/(study)/tools/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { ToolUIPart } from "ai";
import { useTranslations } from "next-intl";

export const SearchPersonasResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<
    ToolUIPart<Pick<StudyUITools, StudyToolName.searchPersonas>>,
    { state: "output-available" }
  >;
}) => {
  const t = useTranslations("Components.SearchPersonasResultMessage");
  const { setViewToolInvocation, setConsoleOpen } = useStudyContext();
  const { personas } = toolInvocation.output;
  if (!personas?.length) {
    return <div className="text-sm text-muted-foreground">No persona found</div>;
  }
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg text-sm">
      <div className="font-medium mb-2 flex items-center gap-2">
        <div>🔍 {t("personasFound", { count: personas.length })}</div>
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
