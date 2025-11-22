import authOptions from "@/app/(auth)/authOptions";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { forbidden, redirect } from "next/navigation";
import { TeamApiKeyCard } from "./TeamApiKeyCard";
import TeamDomainVerificationCard from "./TeamDomainVerificationCard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Team.ApiPage");
  const locale = await getLocale();
  return generatePageMetadata({
    title: t("title"),
    description: t("description"),
    locale,
  });
}

export default async function TeamApiPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/team/api-keys");
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  if (!user.teamIdAsMember) {
    redirect("/account");
  }

  const team = await prisma.team.findUniqueOrThrow({
    where: { id: user.teamIdAsMember },
  });

  if (team.ownerUserId !== user.personalUserId) {
    forbidden();
  }

  return (
    <div className="container max-w-3xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">API Configuration</h1>
        <p className="text-muted-foreground text-sm">
          Manage API keys and domain verification for programmatic access.
        </p>
      </div>

      <div className="space-y-6">
        <TeamApiKeyCard team={team} />
        <TeamDomainVerificationCard team={team} />
      </div>
    </div>
  );
}
