import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { InterviewProjectsClient } from "./InterviewProjectsClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("InterviewProject.projectsList");
  return {
    title: t("title"),
  };
}

export default function InterviewProjectsPage() {
  return <InterviewProjectsClient />;
}
