import { ReactNode } from "react";

interface InterviewProjectLayoutProps {
  children: ReactNode;
}

export default function InterviewProjectLayout({ children }: InterviewProjectLayoutProps) {
  return <>{children}</>;
}
