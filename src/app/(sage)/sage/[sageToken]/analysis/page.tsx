import authOptions from "@/app/(auth)/authOptions";
import { getServerSession } from "next-auth";
import { forbidden, notFound } from "next/navigation";
import { getSageByToken } from "../../../lib";
import { AnalysisTab } from "./AnalysisTab";

export default async function SageAnalysisPage({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}) {
  const token = (await params).sageToken;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    forbidden();
  }

  const sage = await getSageByToken(token);

  if (!sage) {
    notFound();
  }

  // Check ownership
  if (sage.userId !== session.user.id) {
    forbidden();
  }

  return <AnalysisTab sage={sage} />;
}
