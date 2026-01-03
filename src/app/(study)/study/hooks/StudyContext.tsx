"use client";
import { StudyUITools, TStudyMessageWithTool } from "@/app/(study)/tools/types";
import { UserChat } from "@/prisma/client";
import { DynamicToolUIPart, ToolUIPart } from "ai";
import { createContext, ReactNode, useCallback, useContext, useState } from "react";
import { ArtifactsState, useArtifacts } from "./useArtifacts";

type TStudyUserChat = Omit<UserChat, "kind"> & {
  kind: "study";
  messages: TStudyMessageWithTool[];
};

// export type TLastToolInvocation = {
//   toolCallId: string;
//   toolName: string; // StudyToolName; 这里没必要用 StudyToolName 类型，简单一些
//   state: ToolUIPart["state"];
// };

type TLastToolInvocation = DynamicToolUIPart | ToolUIPart<StudyUITools>;

interface StudyContextType {
  studyUserChat: TStudyUserChat;
  replay: boolean;
  consoleOpen: boolean;
  setConsoleOpen: (open: boolean) => void;
  lastToolInvocation: TLastToolInvocation | null;
  // setLastToolInvocation: Dispatch<SetStateAction<TLastToolInvocation | null>>; // 支持 setLastToolInvocation(prev => {})
  setLastToolInvocation: (toolInvocation: TLastToolInvocation | null) => void;
  viewToolInvocation: TLastToolInvocation | null;
  setViewToolInvocation: (toolInvocation: TLastToolInvocation | null) => void;
  unsetViewToolInvocation: () => void;
  artifacts: ArtifactsState;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export function StudyProvider({
  children,
  studyUserChat,
  replay,
}: {
  children: ReactNode;
  studyUserChat: TStudyUserChat;
  replay: boolean;
}) {
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [lastToolInvocation, _setLastToolInvocation] = useState<TLastToolInvocation | null>(null);
  const [viewToolInvocation, _setViewToolInvocation] = useState<TLastToolInvocation | null>(null);

  // Use artifacts hook
  const artifacts = useArtifacts(studyUserChat.token);

  const unsetViewToolInvocation = () => _setViewToolInvocation(null);
  const setLastToolInvocation = useCallback((toolInvocation: TLastToolInvocation | null) => {
    _setLastToolInvocation((prev) => {
      if (!prev || !toolInvocation) {
        return toolInvocation;
      }
      if (
        prev.toolCallId === toolInvocation.toolCallId &&
        prev.type === toolInvocation.type &&
        prev.state === toolInvocation.state
      ) {
        return prev;
      } else {
        return toolInvocation;
      }
    });
  }, []);
  const setViewToolInvocation = useCallback((toolInvocation: TLastToolInvocation | null) => {
    _setViewToolInvocation((prev) => {
      if (!prev || !toolInvocation) {
        return toolInvocation;
      }
      if (
        prev.toolCallId === toolInvocation.toolCallId &&
        prev.type === toolInvocation.type &&
        prev.state === toolInvocation.state
      ) {
        return prev;
      } else {
        return toolInvocation;
      }
    });
  }, []);
  return (
    <StudyContext.Provider
      value={{
        studyUserChat,
        replay,
        consoleOpen,
        setConsoleOpen,
        lastToolInvocation,
        setLastToolInvocation,
        viewToolInvocation,
        setViewToolInvocation,
        unsetViewToolInvocation,
        artifacts,
      }}
    >
      {children}
    </StudyContext.Provider>
  );
}

export function useStudyContext() {
  const context = useContext(StudyContext);
  if (context === undefined) {
    throw new Error("useStudyContext must be used within a StudyProvider");
  }
  return context;
}
