import { getSageByTokenAction } from "@/app/(sage)/(detail)/actions";
import { SageSourceContent, SageSourceExtra } from "@/app/(sage)/types";
import { prisma } from "@/prisma/prisma";
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

  // Fetch sage's sources
  const sources = (
    await prisma.sageSource.findMany({
      where: { sageId: sage.id },
      orderBy: { createdAt: "asc" },
    })
  ).map(({ content, extra, ...source }) => ({
    ...source,
    content: content as SageSourceContent,
    extra: extra as SageSourceExtra,
  }));

  return (
    <SageDetailClientLayout sage={sage} sources={sources}>
      {children}
    </SageDetailClientLayout>
  );
}
