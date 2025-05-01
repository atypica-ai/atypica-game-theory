import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Badge } from "@/components/ui/badge";
import { ToolInvocation } from "ai";
import { FC } from "react";
import { BuildPersonaToolResult } from "../buildPersona";

export const BuildPersonaResultMessage: FC<{
  toolInvocation: Omit<Extract<ToolInvocation, { state: "result" }>, "result"> & {
    result: BuildPersonaToolResult;
  };
}> = ({ toolInvocation }) => {
  const { personas } = toolInvocation.result;
  if (!personas?.length) {
    return <div className="text-sm text-muted-foreground">No persona built</div>;
  }
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Personas</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
        {personas.map((persona) => (
          <div
            key={persona.personaId}
            className="flex items-start gap-3 rounded-lg border border-zinc-100 dark:border-zinc-700/50 p-3 bg-zinc-50 dark:bg-zinc-800"
          >
            <HippyGhostAvatar seed={persona.personaId} className="mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-sm">{persona.name}</div>
              <div className="text-zinc-500 text-xs">{persona.source}</div>
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
    </div>
  );
};
