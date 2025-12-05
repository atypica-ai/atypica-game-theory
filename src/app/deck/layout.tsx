import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { ReactNode } from "react";

/**
 * Public Pages Layout
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
export default async function PublicPagesLayout({ children }: { children: ReactNode }) {
  return (
    <DefaultLayout header={false} fitToViewport={true}>
      {children}
    </DefaultLayout>
  );
}
