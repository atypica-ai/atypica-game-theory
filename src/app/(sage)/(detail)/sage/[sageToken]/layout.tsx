import { getSageByTokenAction } from "@/app/(sage)/(detail)/actions";
import { notFound } from "next/navigation";
import { ReactNode } from "react";
import { SageDetailClientLayout } from "./SageDetailClientLayout";

export default async function SageDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ sageToken: string }>;
}) {
  const token = (await params).sageToken;

  // Get sage using server action (includes auth check and type conversion)
  const sageResult = await getSageByTokenAction(token);

  if (!sageResult.success) {
    notFound();
  }

  const sage = sageResult.data;

  return <SageDetailClientLayout sage={sage}>{children}</SageDetailClientLayout>;
}
