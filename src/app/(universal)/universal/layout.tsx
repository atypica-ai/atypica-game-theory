import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { ReactNode } from "react";

/**
 * Universal Agent Layout
 *
 * This layout wraps all pages in the (universal) route group
 */
export default async function UniversalLayout({ children }: { children: ReactNode }) {
  return (
    <DefaultLayout header={true} footer={false} fitToViewport={true}>
      {children}
    </DefaultLayout>
  );
}
