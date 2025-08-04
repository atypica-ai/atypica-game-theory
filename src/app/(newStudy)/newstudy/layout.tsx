import GlobalHeader from "@/components/GlobalHeader";
import { ReactNode } from "react";

export default async function NewStudyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-dvh">
      <GlobalHeader />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
