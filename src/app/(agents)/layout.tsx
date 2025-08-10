import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { ReactElement } from "react";

export default async function AgentsPageLayout({
  children,
}: {
  children: ReactElement<React.ComponentProps<typeof FitToViewport>>;
}) {
  return (
    <DefaultLayout header={true} fitToViewport={true}>
      {children}
    </DefaultLayout>
  );
}
