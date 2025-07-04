import { LeftMenus } from "@/app/(public)/LeftMenu";
import GlobalHeader from "@/components/GlobalHeader";
import { ReactNode } from "react";

export default async function CollectSessionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-dvh">
      <GlobalHeader leftMenus={<LeftMenus />} />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
