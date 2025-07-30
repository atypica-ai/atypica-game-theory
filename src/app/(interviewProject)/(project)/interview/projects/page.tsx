import { Metadata } from "next";
import { InterviewProjectsClient } from "./InterviewProjectsClient";

export const metadata: Metadata = {
  title: "Interview Projects",
};

export default function InterviewProjectsPage() {
  return <InterviewProjectsClient />;
}
