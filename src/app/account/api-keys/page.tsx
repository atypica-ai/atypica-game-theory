import authOptions from "@/app/(auth)/authOptions";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserApiKeyCard } from "./UserApiKeyCard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AccountPage.ApiKeyPage");
  const locale = await getLocale();
  return generatePageMetadata({
    title: t("title"),
    description: t("description"),
    locale,
  });
}

export default async function UserApiKeyPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/account/api-keys");
  }

  return (
    <div className="container max-w-3xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">API Configuration</h1>
        <p className="text-muted-foreground text-sm">
          Manage your personal API key for programmatic access.{" "}
          <Link href="/docs/mcp" className="font-medium hover:underline">
            View documentation
          </Link>
        </p>
      </div>

      <div className="space-y-6">
        <UserApiKeyCard />
      </div>
    </div>
  );
}
