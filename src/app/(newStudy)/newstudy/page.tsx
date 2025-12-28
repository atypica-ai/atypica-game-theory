import authOptions from "@/app/(auth)/authOptions";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { NewStudyChatIntro } from "./NewStudyChatIntro";
import { NewStudyClient } from "./NewStudyClient";
import "./style.css";

export default async function NewStudyPage({
  searchParams,
}: {
  searchParams: Promise<{ interview?: "1"; brief?: string; studyType?: string }>;
}) {
  const { interview, brief, studyType: _studyType } = await searchParams;
  const studyType =
    _studyType === "general" || _studyType === "product-rnd" || _studyType === "fast-insight"
      ? _studyType
      : undefined;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    // Build callback URL with all params
    const params = new URLSearchParams();
    if (interview) params.set("interview", interview);
    if (brief) params.set("brief", brief);
    if (studyType) params.set("studyType", studyType);
    const queryString = params.toString();
    const callbackUrl = `/newstudy${queryString ? `?${queryString}` : ""}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (interview) {
    return <NewStudyChatIntro />;
  }

  return <NewStudyClient initialBrief={brief} initialStudyType={studyType} />;
}
