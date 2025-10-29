import authOptions from "@/app/(auth)/authOptions";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { forbidden, notFound } from "next/navigation";
import { getSageByToken } from "../../../lib";
import { GapsTab } from "./GapsTab";

export default async function SageGapsPage({
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

  const { sage } = result;

  // Check ownership
  if (sage.userId !== session.user.id) {
    forbidden();
  }

  // Fetch knowledge gaps for this sage
  const gaps = await prisma.sageKnowledgeGap.findMany({
    where: { sageId: sage.id },
    orderBy: [{ status: "asc" }, { severity: "asc" }, { createdAt: "desc" }],
  });

  return <GapsTab sage={sage} gaps={gaps} />;
}
