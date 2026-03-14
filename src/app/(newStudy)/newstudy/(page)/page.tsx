import authOptions from "@/app/(auth)/authOptions";
import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { NewStudyChatIntro } from "./NewStudyChatIntro";
import { NewStudyClient } from "./NewStudyClient";
import "./style.css";

export default async function NewStudyPage({
  searchParams,
}: {
  searchParams: Promise<{ interview?: "1"; brief?: string }>;
}) {
  const { interview, brief } = await searchParams;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    // Build callback URL with all params
    const params = new URLSearchParams();
    if (interview) params.set("interview", interview);
    if (brief) params.set("brief", brief);
    const queryString = params.toString();
    const callbackUrl = `/newstudy${queryString ? `?${queryString}` : ""}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (interview) {
    return (
      <DefaultLayout header={true} fitToViewport={true}>
        <NewStudyChatIntro />
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout header={true} footer={true} containedHeader>
      <NewStudyClient initialBrief={brief} />
    </DefaultLayout>
  );
}
