import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { StudyListPageClient } from "./StudyListPageClient";

export default async function StudiesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/studies`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return <StudyListPageClient />;
}
