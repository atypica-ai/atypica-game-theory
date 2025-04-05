"use client";
import { ToolInvocation } from "ai";
import { createContext, ReactNode, useContext, useState } from "react";

interface StudyContextType {
  studyUserChatId: number;
  replay: boolean;
  lastToolInvocation: ToolInvocation | null;
  setLastToolInvocation: (toolInvocation: ToolInvocation | null) => void;
  viewToolInvocation: ToolInvocation | null;
  setViewToolInvocation: (toolInvocation: ToolInvocation | null) => void;
  unsetViewToolInvocation: () => void;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export function StudyProvider({
  children,
  studyUserChatId,
  replay,
}: {
  children: ReactNode;
  studyUserChatId: number;
  replay: boolean;
}) {
  const [lastToolInvocation, setLastToolInvocation] = useState<ToolInvocation | null>(null);
  const [viewToolInvocation, setViewToolInvocation] = useState<ToolInvocation | null>(null);
  const unsetViewToolInvocation = () => setViewToolInvocation(null);
  return (
    <StudyContext.Provider
      value={{
        studyUserChatId,
        replay,
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
