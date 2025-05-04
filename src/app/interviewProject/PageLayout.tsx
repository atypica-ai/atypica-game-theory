import GlobalHeader from "@/components/GlobalHeader";
import { ReactNode } from "react";

export function PageLayout({ children, menus }: { children: ReactNode; menus?: ReactNode }) {
  return (
    <div className="h-dvh flex flex-col items-stretch justify-start">
      <GlobalHeader>{menus}</GlobalHeader>
      {children}
    </div>
  );
}
