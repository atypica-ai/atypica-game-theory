import GlobalFooter from "@/components/layout/GlobalFooter";
import GlobalHeader from "@/components/layout/GlobalHeader";
import { ReactNode } from "react";

export default async function DefaultLayout({
  children,
  header = false,
  footer = false,
  fitToViewport = false,
}: {
  children: ReactNode;
  header?: Boolean;
  footer?: Boolean;
  fitToViewport?: Boolean;
}) {
  if (fitToViewport && footer) {
    throw new Error("fitToViewport and footer cannot be used together");
  }
  return fitToViewport ? (
    <div className="h-dvh flex flex-col items-stretch justify-start overflow-hidden">
      {header && <GlobalHeader />}
      <main className="flex-1 overflow-hidden">{children}</main>
      {footer && <GlobalFooter />}
    </div>
  ) : (
    <div className="pt-16 min-h-dvh flex flex-col items-stretch justify-start overflow-y-auto scrollbar-thin">
      {header && <GlobalHeader className="h-16 fixed top-0 left-0 right-0 z-10" />}
      {children}
      {footer && <GlobalFooter />}
    </div>
  );
}
