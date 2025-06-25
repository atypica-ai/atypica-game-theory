import { LeftMenus } from "@/app/(public)/LeftMenu";
import GlobalHeader from "@/components/GlobalHeader";
import { ReactNode } from "react";

export default async function AccountPagesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pt-16 min-h-dvh flex flex-col items-stretch justify-start overflow-y-auto scrollbar-thin">
      <GlobalHeader className="h-16 fixed top-0 left-0 right-0 z-10" leftMenus={<LeftMenus />} />
      {children}
    </div>
  );
}
