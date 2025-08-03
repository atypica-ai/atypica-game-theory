import { LeftMenus } from "@/app/(public)/LeftMenu";
import GlobalHeader from "@/components/GlobalHeader";
import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "团队管理 - Atypica",
  description: "团队管理和协作",
};

export default async function TeamLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pt-16 min-h-dvh flex flex-col items-stretch justify-start overflow-y-auto scrollbar-thin">
      <GlobalHeader className="h-16 fixed top-0 left-0 right-0 z-10" leftMenus={<LeftMenus />} />
      {children}
    </div>
  );
}
