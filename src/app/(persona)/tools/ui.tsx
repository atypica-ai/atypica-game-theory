import { TPersonaMessageWithTool } from "@/app/(persona)/types";
import { getToolName } from "ai";

export const PersonaToolUIPartDisplay = ({
  toolUIPart,
}: {
  toolUIPart: TPersonaMessageWithTool["parts"][number];
}) => {
  switch (toolUIPart.type) {
    case "tool-endInterview":
      // return <RequestInteractionMessage toolInvocation={toolUIPart} />;
      return (
        <div className="font-mono text-xs text-muted-foreground">
          exec {getToolName(toolUIPart)}
        </div>
      );
    default:
      return null;
  }
};
