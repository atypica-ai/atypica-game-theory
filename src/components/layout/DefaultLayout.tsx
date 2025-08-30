import { FitToViewport } from "@/components/layout/FitToViewport";
import GlobalFooter from "@/components/layout/GlobalFooter";
import GlobalHeader from "@/components/layout/GlobalHeader";
import { cn } from "@/lib/utils";
import React, { ReactElement, ReactNode } from "react";

type DefaultLayoutProps = {
  header?: boolean;
} & (
  | {
      fitToViewport: true;
      footer?: false; // footer cannot be used with fitToViewport
      // This type hint guides developers but is not enforced at runtime for Next.js pages
      // due to lazy loading.
      children: ReactElement<React.ComponentProps<typeof FitToViewport>>;
    }
  | {
      fitToViewport?: false;
      footer?: boolean;
      children: ReactNode;
    }
);

export async function DefaultLayout({
  children,
  header = false,
  footer = false,
  fitToViewport = false,
}: DefaultLayoutProps) {
  if (fitToViewport && footer) {
    // This case is already handled by the type definition, but a runtime check
    // is good practice for non-TypeScript environments.
    throw new Error("The `footer` prop cannot be used when `fitToViewport` is true.");
  }

  // The previous runtime check for `children.type === FitToViewport` has been removed.
  // It is unreliable in a Next.js environment because page components passed as
  // `children` are often lazy-loaded and their type is not directly inspectable.
  // We now rely on TypeScript's static analysis to guide correct usage.

  return fitToViewport ? (
    <div className="h-dvh flex flex-col items-stretch justify-start overflow-hidden">
      {header && <GlobalHeader />}
      {children}
    </div>
  ) : (
    <div
      className={cn(
        "min-h-dvh flex flex-col items-stretch justify-start overflow-y-auto scrollbar-thin",
        { "pt-16": !!header },
      )}
    >
      {header && <GlobalHeader className="h-16 fixed top-0 left-0 right-0 z-10" />}
      {children}
      {footer && <GlobalFooter />}
    </div>
  );
}
