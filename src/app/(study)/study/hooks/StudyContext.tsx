"use client";
import { UserChat } from "@/prisma/client";
import { ToolInvocation, UIMessage } from "ai";
import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useState } from "react";

type TStudyUserChat = Omit<UserChat, "kind"> & {
  kind: "study";
  messages: UIMessage[];
};

interface StudyContextType {
  studyUserChat: TStudyUserChat;
  replay: boolean;
  consoleOpen: boolean;
  setConsoleOpen: (open: boolean) => void;
  lastToolInvocation: ToolInvocation | null;
  setLastToolInvocation: Dispatch<SetStateAction<ToolInvocation | null>>; //(toolInvocation: ToolInvocation | null) => void;
  viewToolInvocation: ToolInvocation | null;
  setViewToolInvocation: (toolInvocation: ToolInvocation | null) => void;
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
  const [lastToolInvocation, setLastToolInvocation] = useState<ToolInvocation | null>(null);
  const [viewToolInvocation, setViewToolInvocation] = useState<ToolInvocation | null>(null);
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
