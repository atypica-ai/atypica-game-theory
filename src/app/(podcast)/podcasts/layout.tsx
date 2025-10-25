import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { ReactNode } from "react";

export default async function MyPodcastsPageLayout({ children }: { children: ReactNode }) {
  return (
    <DefaultLayout header={true} footer={true}>
      {children}
    </DefaultLayout>
  );
}
