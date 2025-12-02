"use client";

import {
  SageStatusProvider,
  SageWithTypedFields,
  type SageStats,
} from "@/app/(sage)/(detail)/hooks/SageContext";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Separator } from "@/components/ui/separator";
import { ReactNode } from "react";
import { SageIdentityCard } from "./components/SageIdentityCard";
import { SageStatusBar } from "./components/SageStatusBar";
import { SourcesPanel } from "./components/SourcesPanel";
import { TabNavigation } from "./components/TabNavigation";

export function SageDetailClientLayout({
  sage,
  stats,
  children,
}: {
  sage: SageWithTypedFields;
  stats: SageStats;
  children: ReactNode;
}) {
  return (
    <SageStatusProvider initialSage={sage} initialStats={stats}>
      <FitToViewport className="flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {/* Desktop: Left Panel - Identity & Sources */}
          <div className="hidden lg:flex w-1/3 min-w-[320px] max-w-[480px] border-r border-border flex-col">
            <div className="shrink-0">
              <SageIdentityCard sage={sage} variant="sidebar" />
            </div>
            <Separator />
            <div className="flex-1 overflow-y-auto">
              <SourcesPanel />
            </div>
          </div>

          {/* Mobile & Tablet: Content with Collapsible Header */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile: Collapsible Identity Card */}
            <div className="lg:hidden">
              <SageIdentityCard sage={sage} variant="collapsible" />
            </div>

            {/* Tab Navigation */}
            <TabNavigation sageToken={sage.token} />

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </div>
        </div>

        {/* Status Bar at Bottom */}
        <SageStatusBar />
      </FitToViewport>
    </SageStatusProvider>
  );
}
