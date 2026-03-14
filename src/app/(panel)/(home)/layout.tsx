import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { ReactNode } from "react";

export default async function PanelHomeLayout({ children }: { children: ReactNode }) {
  return (
    <DefaultLayout header={true} footer={true} containedHeader>
      {children}
    </DefaultLayout>
  );
}
