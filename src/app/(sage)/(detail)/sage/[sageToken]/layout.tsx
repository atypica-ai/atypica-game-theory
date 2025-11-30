import authOptions from "@/app/(auth)/authOptions";
import { SageAvatar, SageExtra, SageSourceContent, SageSourceExtra } from "@/app/(sage)/types";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { forbidden, notFound } from "next/navigation";
import { ReactNode } from "react";
import { SourcesPanel } from "./components/SourcesPanel";
import { TabNavigation } from "./components/TabNavigation";

export default async function SageDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ sageToken: string }>;
}) {
  const token = (await params).sageToken;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    forbidden();
  }

  // Get sage with all fields needed for SourcesPanel
  const sageData = await prisma.sage.findUnique({
    where: { token },
  });

  if (!sageData) {
    notFound();
  }

  // Check ownership
  if (sageData.userId !== session.user.id) {
    forbidden();
  }

  // Cast types for extra fields
  const sage = {
    ...sageData,
    extra: sageData.extra as SageExtra,
    expertise: sageData.expertise as string[],
    avatar: sageData.avatar as SageAvatar,
  };

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
    <FitToViewport className="flex overflow-hidden">
      {/* Left Panel - Sources */}
      <div className="w-1/3 border-r border-border overflow-y-auto">
        <SourcesPanel sage={sage} sources={sources} />
      </div>

      {/* Right Panel - Tab Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TabNavigation sageToken={sage.token} />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </FitToViewport>
  );
}
