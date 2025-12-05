import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { ReactNode } from "react";

/**
 * New Study Layout
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
export default async function NewStudyLayout({ children }: { children: ReactNode }) {
  return (
    <DefaultLayout header={true} fitToViewport={true}>
      {children}
    </DefaultLayout>
  );
}
