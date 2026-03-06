import authOptions from "@/app/(auth)/authOptions";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import ContextBuilderPageClient from "./ContextBuilderPageClient";

export default async function ContextBuilderPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    const callbackUrl = `/user/memory-builder`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return <ContextBuilderPageClient />;
}
