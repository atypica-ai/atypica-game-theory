"use client";

import { SageStatusProvider, SageWithTypedFields } from "@/app/(sage)/(detail)/hooks/SageContext";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { ReactNode } from "react";
import { SageStatusBar } from "./components/SageStatusBar";
import { SageStatusRefresher } from "./components/SageStatusRefresher";
import { SourcesPanel } from "./components/SourcesPanel";
import { TabNavigation } from "./components/TabNavigation";

export function SageDetailClientLayout({
  sage,
  children,
}: {
  sage: SageWithTypedFields;
  children: ReactNode;
}) {
  return (
    <SageStatusProvider initialSage={sage}>
      <SageStatusRefresher />
      <FitToViewport className="flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Sources */}
          <div className="w-1/3 border-r border-border overflow-y-auto">
            <SourcesPanel />
          </div>
          {/* Right Panel - Tab Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <TabNavigation sageToken={sage.token} />
            <div className="flex-1 overflow-y-auto">{children}</div>
          </div>
        </div>
        {/* Status Bar at Bottom */}
        <SageStatusBar />
      </FitToViewport>
    </SageStatusProvider>
  );
}
