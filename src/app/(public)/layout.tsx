import GlobalHeader from "@/components/GlobalHeader";
import { ReactNode } from "react";
import { LeftMenus } from "./LeftMenu";

export default async function PublicPagesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh flex flex-col items-stretch justify-start">
      <GlobalHeader leftMenus={<LeftMenus />} />
      {children}
    </div>
  );
}
