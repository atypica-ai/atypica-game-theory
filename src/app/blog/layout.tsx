import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { ReactNode } from "react";

export default async function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <DefaultLayout header={true} footer={true}>
      {children}
    </DefaultLayout>
  );
}
