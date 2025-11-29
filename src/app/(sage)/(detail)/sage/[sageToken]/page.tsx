import authOptions from "@/app/(auth)/authOptions";
import { getSageByToken } from "@/app/(sage)/lib";
import { generatePageMetadata } from "@/lib/request/metadata";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { forbidden, notFound } from "next/navigation";
import { MemoryTab } from "./MemoryTab";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Sage.detail.metadata");
  const { sageToken } = await params;
  const result = await getSageByToken(sageToken);
  if (!result) {
    return {};
  }
  const { sage } = result;
  return generatePageMetadata({
    title: `${sage.name} - ${t("memoryTitle")}`,
    description: t("memoryDescription"),
    locale,
  });
}

export default async function SageMemoryPage({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}) {
  const token = (await params).sageToken;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    forbidden();
  }

  const result = await getSageByToken(token);

  if (!result) {
    notFound();
  }

  const { sage, memoryDocument } = result;

  // Check ownership
  if (sage.userId !== session.user.id) {
    forbidden();
  }

  return <MemoryTab sage={sage} memoryDocument={memoryDocument} />;
}
