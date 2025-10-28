import { ReactNode } from "react";

export default async function SageChatLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="h-screen overflow-hidden">{children}</div>;
}
