import authOptions from "@/app/(auth)/authOptions";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { CapabilitiesPageClient } from "./CapabilitiesPageClient";
import { fetchUserMemory } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AccountPage.capabilities");
  const locale = await getLocale();
  return generatePageMetadata({
    title: t("title"),
    description: t("description"),
    locale,
  });
}

export default async function CapabilitiesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/account/capabilities");
  }

  const memoryResult = await fetchUserMemory();
  const memory = memoryResult.success ? memoryResult.data : null;

  return <CapabilitiesPageClient initialMemory={memory} />;
}
