import GlobalFooter from "@/components/layout/GlobalFooter";
import GlobalHeader from "@/components/layout/GlobalHeader";
import { cn } from "@/lib/utils";
import { isValidElement, ReactNode } from "react";

/**
 * DefaultLayout Props
 *
 * When fitToViewport is true, child pages should wrap their content in <FitToViewport>
 * This is documented but not strictly enforced at the type level due to Next.js lazy loading.
 */
export type DefaultLayoutProps = {
  header?: boolean;
  containedHeader?: boolean;
  children: ReactNode;
} & (
  | {
      fitToViewport: true;
      footer?: false; // footer cannot be used with fitToViewport
    }
  | {
      fitToViewport?: false;
      footer?: boolean;
    }
);

export async function DefaultLayout({
  children,
  header = false,
  footer = false,
  fitToViewport = false,
  containedHeader = false,
}: DefaultLayoutProps) {
  if (fitToViewport && footer) {
    // This case is already handled by the type definition, but a runtime check
    // is good practice for non-TypeScript environments.
    throw new Error("The `footer` prop cannot be used when `fitToViewport` is true.");
  }

  // Development-only runtime validation for fitToViewport usage
  if (process.env.NODE_ENV === "development" && fitToViewport) {
    // Check if children is a valid React element
    if (isValidElement(children)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const childType = (children as any).type;

      // Try to get the component name or displayName
      const componentName =
        typeof childType === "function"
          ? childType.displayName || childType.name
          : typeof childType === "string"
            ? childType
            : "Unknown";

      // Warn if the child is not FitToViewport
      // Note: This check may not work reliably with Next.js lazy-loaded pages,
      // but it will catch cases where we can inspect the component type
      if (componentName !== "FitToViewport" && !componentName.includes("FitToViewport")) {
        console.warn(
          `⚠️ [DefaultLayout] When fitToViewport is true, children should be wrapped in <FitToViewport>. ` +
            `Current child component: ${componentName}. ` +
            `This may not be enforced due to Next.js lazy loading, but please follow the convention.`,
        );
      }
    }
  }

  return fitToViewport ? (
    <div className="h-dvh flex flex-col items-stretch justify-start overflow-hidden">
      {header && <GlobalHeader contained={containedHeader} />}
      {children}
    </div>
  ) : (
    <div
      className={cn(
        "min-h-dvh flex flex-col items-stretch justify-start overflow-y-auto scrollbar-thin",
        { "pt-16": !!header },
      )}
    >
      {header && (
        <GlobalHeader className="h-16 fixed top-0 left-0 right-0 z-10" contained={containedHeader} />
      )}
      {children}
      {footer && <GlobalFooter />}
    </div>
  );
}
