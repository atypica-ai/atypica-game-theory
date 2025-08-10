import GlobalHeader from "@/components/layout/GlobalHeader";
import { ReactNode } from "react";

export default async function AgentsPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh flex flex-col items-stretch justify-start">
      <GlobalHeader />
      {children}
    </div>
  );
}
