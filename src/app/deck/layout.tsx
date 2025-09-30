import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { ReactElement } from "react";

export default async function PublicPagesLayout({
  children,
}: {
  children: ReactElement<React.ComponentProps<typeof FitToViewport>>;
}) {
  return (
    <DefaultLayout header={false} fitToViewport={true}>
      {children}
    </DefaultLayout>
  );
}
