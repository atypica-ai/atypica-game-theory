import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { ReactNode } from "react";

export default async function PublicPagesLayout({ children }: { children: ReactNode }) {
  return (
    <DefaultLayout header={true} footer={true} contained>
      {children}
    </DefaultLayout>
  );
}
