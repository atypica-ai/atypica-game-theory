import { fetchAnalystInterviews } from "@/app/(legacy)/interview/actions";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtractServerActionData } from "@/lib/serverAction";
import { CircleCheckBig, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

type AnalystInterview = ExtractServerActionData<typeof fetchAnalystInterviews>[number];

export function InterviewCard({ interview }: { interview: AnalystInterview }) {
  const t = useTranslations("AnalystPage.InterviewCard");

  return (
    <Card key={interview.id} className="w-full">
      <CardHeader>
        <CardTitle className="line-clamp-1">{interview.persona.name}</CardTitle>
        <CardDescription className="mt-2 line-clamp-1">
          {(interview.persona.tags as string[])?.join(", ")}
        </CardDescription>
      </CardHeader>
      <CardFooter className="justify-between">
        {interview.interviewToken ? (
          <div className="flex items-center justify-start gap-2 text-sm">
            <LoaderCircle className="animate-spin text-orange-300 size-4" />
            {t("interviewing")}
          </div>
        ) : interview.conclusion ? (
          <div className="flex items-center justify-start gap-2 text-sm">
            <CircleCheckBig className="text-green-600 size-4" />
            {t("concluded")}
          </div>
        ) : (
          <div></div>
        )}
        <Link
          href={`/interview/${interview.id}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {interview.conclusion ? t("viewSummary") : t("startInterview")} →
        </Link>
      </CardFooter>
    </Card>
  );
}
