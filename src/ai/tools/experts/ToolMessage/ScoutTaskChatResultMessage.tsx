import { StudyUITools, ToolName } from "@/ai/tools/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Badge } from "@/components/ui/badge";
import { ToolUIPart } from "ai";
import { useTranslations } from "next-intl";

export const ScoutTaskChatResultMessage = ({
  toolInvocation,
}: {
  toolInvocation: Extract<
    ToolUIPart<Pick<StudyUITools, ToolName.scoutTaskChat>>,
    { state: "output-available" }
  >;
}) => {
  const t = useTranslations("Components.ScoutTaskChatResultMessage");
  const { personas, stats } = toolInvocation.output;
  // if (!personas || personas.length === 0) {
  //   return <div className="text-sm text-muted-foreground">No personas found.</div>;
  // }
  return (
    <div className="space-y-4">
      {personas?.length && (
        <>
          <h3 className="text-sm font-medium">Personas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
            {personas.map((persona) => (
              <div
                key={persona.id}
                className="flex items-start gap-3 rounded-lg border border-zinc-100 dark:border-zinc-700/50 p-3 bg-zinc-50 dark:bg-zinc-800"
              >
                <HippyGhostAvatar seed={persona.id} className="mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{persona.name}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {persona.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {stats && (
        <>
          <h3 className="text-sm font-medium">📊 {t("searchStats")}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(stats).map(([platform, count], index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border border-zinc-100 dark:border-zinc-700/50 p-3 bg-zinc-50 dark:bg-zinc-800"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{platform}</div>
                  <div className="text-sm">{count} steps</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
