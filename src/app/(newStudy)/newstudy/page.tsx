import authOptions from "@/app/(auth)/authOptions";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { NewStudyChatIntro } from "./NewStudyChatIntro";
import { NewStudyClient } from "./NewStudyClient";
import "./style.css";

export default async function NewStudyPage({
  searchParams,
}: {
  searchParams: Promise<{ interview?: "1" }>;
}) {
  const { interview } = await searchParams;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/newstudy${interview ? `?interview=${interview}` : ""}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (interview) {
    return <NewStudyChatIntro />;
  }

  return <NewStudyClient />;
}
