import authOptions from "@/app/(auth)/authOptions";
import { getServerSession } from "next-auth";
import { forbidden, notFound } from "next/navigation";
import { getSageByToken } from "../../lib";
import { MemoryTab } from "./MemoryTab";

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
