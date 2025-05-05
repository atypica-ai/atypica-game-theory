"use client";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function BackToProjectsButton() {
  const t = useTranslations("InterviewProject");

  return (
    <Button variant="ghost" asChild>
      <Link href="/interviewProject">
        <ArrowLeftIcon className="h-4 w-4" />
        {t("backToProjects")}
      </Link>
    </Button>
  );
}

export function BackToProjectButton({ projectToken }: { projectToken: string }) {
  const t = useTranslations("InterviewProject");

  return (
    <Button variant="ghost" asChild>
      <Link href={`/interviewProject/${projectToken}`}>
        <ArrowLeftIcon className="h-4 w-4" />
        {t("backToProject")}
      </Link>
    </Button>
  );
}
