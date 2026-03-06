import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { StudyToolName, StudyUITools } from "@/app/(study)/tools/types";
import { StudyToolUIPartDisplay } from "@/app/(study)/tools/ui";
import { InterviewExecutionView } from "@/app/(study)/study/console/shared/InterviewExecutionView";
import { ToolUIPart } from "ai";

export const InterviewChatConsole = ({
  toolInvocation,
}: {
  toolInvocation: ToolUIPart<Pick<StudyUITools, StudyToolName.interviewChat>>;
}) => {
  const { studyUserChat, replay } = useStudyContext();

  return (
    <InterviewExecutionView
      toolInvocation={toolInvocation}
      studyUserChatToken={studyUserChat.token}
      studyUserAvatarSeed={studyUserChat.id}
      replay={replay}
      researchTopic={studyUserChat.context.studyTopic}
      renderToolUIPart={(toolPart) => <StudyToolUIPartDisplay toolUIPart={toolPart} />}
    />
  );
};
