import authOptions from "@/app/(auth)/authOptions";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { MemoryBuilderPageClient } from "../../components/MemoryBuilderPageClient";

export default async function UserMemoryBuilderPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    const callbackUrl = `/user/memory-builder`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return <MemoryBuilderPageClient mode="user" />;
}
