import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Badge } from "@/components/ui/badge";
import { ScoutTaskChatResult } from "@/tools/experts/scoutTask";
import { ToolInvocation } from "ai";
import { FC, useMemo } from "react";

export const ScoutTaskResultMessage: FC<{
  toolInvocation: ToolInvocation;
}> = ({ toolInvocation }) => {
  const taskResult = useMemo(() => {
    if (toolInvocation.state === "result") {
      const { personas, stats } = toolInvocation.result as ScoutTaskChatResult;
      return { personas, stats };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolInvocation.state]);

  // if (!personas || personas.length === 0) {
  //   return <div className="text-sm text-muted-foreground">No personas found.</div>;
  // }

  return (
    <div className="space-y-4">
      {taskResult?.personas?.length && (
        <>
          <h3 className="text-sm font-medium">Personas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
            {taskResult.personas.map((persona) => (
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
      {taskResult?.stats && (
        <>
          <h3 className="text-sm font-medium">Stats</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(taskResult.stats).map(([platform, count], index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border border-zinc-100 dark:border-zinc-700/50 p-3 bg-zinc-50 dark:bg-zinc-800"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{platform}</div>
                  <div className="text-sm">{count}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
