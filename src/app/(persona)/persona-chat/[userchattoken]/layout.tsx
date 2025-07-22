import { LeftMenus } from "@/app/(public)/LeftMenu";
import GlobalHeader from "@/components/GlobalHeader";
import { ReactNode } from "react";

export default async function PersonaChatLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh flex flex-col items-stretch justify-start">
      <GlobalHeader leftMenus={<LeftMenus />} />
      {children}
    </div>
  );
}
