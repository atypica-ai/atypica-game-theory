import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { ReactNode } from "react";

/**
 * Agents Layout
 *
 * This layout expects all child pages to wrap their content in <FitToViewport>
 *
 * @example
 * ```tsx
 * export default function Page() {
 *   return <FitToViewport>{content}</FitToViewport>
 * }
 * ```
 */
export default async function PanelPageLayout({ children }: { children: ReactNode }) {
  return (
    <DefaultLayout header={true} fitToViewport={false}>
      {children}
    </DefaultLayout>
  );
}
