import { Metadata } from "next";
import { InterviewProjectsClient } from "./InterviewProjectsClient";

export const metadata: Metadata = {
  title: "Interview Projects",
  description: "Manage your interview projects",
};

export default function InterviewProjectsPage() {
  return <InterviewProjectsClient />;
}
