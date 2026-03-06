import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { StudyToolName, StudyUITools } from "@/app/(study)/tools/types";
import { StudyToolUIPartDisplay } from "@/app/(study)/tools/ui";
import { ScoutExecutionView } from "@/app/(study)/study/console/shared/ScoutExecutionView";
import { ToolUIPart } from "ai";

export const ScoutTaskChatConsole = ({
  toolInvocation,
}: {
  toolInvocation: ToolUIPart<
    Pick<StudyUITools, StudyToolName.scoutTaskChat | StudyToolName.scoutSocialTrends>
  >;
}) => {
  const { studyUserChat, replay } = useStudyContext();

  return (
    <ScoutExecutionView
      toolInvocation={toolInvocation}
      studyUserChatToken={studyUserChat.token}
      replay={replay}
      renderToolUIPart={(toolPart) => <StudyToolUIPartDisplay toolUIPart={toolPart} />}
    />
  );
};
