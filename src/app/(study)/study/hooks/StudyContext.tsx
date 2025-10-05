"use client";
import { TMessageWithTool } from "@/app/(study)/study/types";
import { UserChat } from "@/prisma/client";
import { ToolUIPart } from "ai";
import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useState } from "react";

type TStudyUserChat = Omit<UserChat, "kind"> & {
  kind: "study";
  messages: TMessageWithTool[];
};

export type TLastToolInvocation = {
  toolCallId: string;
  toolName: string; // ToolName; 这里没必要用 ToolName 类型，简单一些
  state: ToolUIPart["state"];
};

interface StudyContextType {
  studyUserChat: TStudyUserChat;
  replay: boolean;
  consoleOpen: boolean;
  setConsoleOpen: (open: boolean) => void;
  lastToolInvocation: TLastToolInvocation | null;
  setLastToolInvocation: Dispatch<SetStateAction<TLastToolInvocation | null>>; // 支持 setLastToolInvocation(prev => {})
  // setLastToolInvocation: (toolInvocation: TLastToolInvocation | null) => void;
  viewToolInvocation: TLastToolInvocation | null;
  setViewToolInvocation: Dispatch<SetStateAction<TLastToolInvocation | null>>;
  // setViewToolInvocation: (toolInvocation: TLastToolInvocation | null) => void;
  unsetViewToolInvocation: () => void;
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
  const [lastToolInvocation, setLastToolInvocation] = useState<TLastToolInvocation | null>(null);
  const [viewToolInvocation, setViewToolInvocation] = useState<TLastToolInvocation | null>(null);
  const unsetViewToolInvocation = () => setViewToolInvocation(null);
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
