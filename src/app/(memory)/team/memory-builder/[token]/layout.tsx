import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { ReactNode } from "react";

export default async function ContextBuilderChatLayout({ children }: { children: ReactNode }) {
  return (
    <DefaultLayout header={true} fitToViewport={true}>
      {children}
    </DefaultLayout>
  );
}
