import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { ReactNode } from "react";

/**
 * Panel Page Layout
 *
 * Full-screen layout with no footer. All child pages should wrap their content in <FitToViewport>.
 *
 * @example
 * ```tsx
 * export default function Page() {
 *   return <FitToViewport>{content}</FitToViewport>
 * }
 * ```
 */
export default async function PanelListPageLayout({ children }: { children: ReactNode }) {
  return (
    <DefaultLayout header={true} fitToViewport={true}>
      {children}
    </DefaultLayout>
  );
}
