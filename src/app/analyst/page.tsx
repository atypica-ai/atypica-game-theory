import authOptions from "@/app/(auth)/authOptions";
import { throwServerActionError } from "@/lib/serverAction";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { AnalystsList } from "./AnalystsList";
import { fetchAnalysts } from "./actions";

export const dynamic = "force-dynamic";

export default async function AnalystsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/analyst");
  }

  const analystsResult = await fetchAnalysts();
  if (!analystsResult.success) {
    throwServerActionError(analystsResult);
  }
  return <AnalystsList analysts={analystsResult.data} />;
}
