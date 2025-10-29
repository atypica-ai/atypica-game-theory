import authOptions from "@/app/(auth)/authOptions";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { forbidden, notFound } from "next/navigation";
import { ReactNode } from "react";
import { getSageByToken } from "../../lib";
import { SourcesPanel } from "./SourcesPanel";
import { TabNavigation } from "./TabNavigation";

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

  const result = await getSageByToken(token);

  if (!result) {
    notFound();
  }

  const { sage } = result;

  // Check ownership
  if (sage.userId !== session.user.id) {
    forbidden();
  }

  // Fetch sage's sources
  const sources = await prisma.sageSource.findMany({
    where: { sageId: sage.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Panel - Sources */}
      <div className="w-1/3 border-r border-border overflow-y-auto">
        <SourcesPanel sage={sage} sources={sources} />
      </div>

      {/* Right Panel - Tab Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TabNavigation sageToken={sage.token} />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
