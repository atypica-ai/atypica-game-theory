import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { ReactNode } from "react";

export default function FeaturesLayout({ children }: { children: ReactNode }) {
  return (
    <DefaultLayout header={true} footer={true}>
      {children}
    </DefaultLayout>
  );
}
