"use client";
import { fetchInterviewSessionStatsByProjectToken } from "@/app/(interviewProject)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExtractServerActionData } from "@/lib/serverAction";
import { Bot, CheckCircle, Clock, MessageSquare, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

export function ProjectStatsSection({
  projectToken,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  readOnly = false,
}: {
  projectToken: string;
  readOnly?: boolean;
}) {
  const t = useTranslations("InterviewProject.projectDetails");
  const tStats = useTranslations("InterviewProject.statistics");
  const [stats, setStats] = useState<ExtractServerActionData<
    typeof fetchInterviewSessionStatsByProjectToken
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchInterviewSessionStatsByProjectToken({ projectToken });
      if (!result.success) throw result;
      setStats(result.data);
    } catch (error) {
      setError((error as Error).message || "Failed to fetch statistics");
      console.log("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, [projectToken]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-1/2 mb-2" />
              <Skeleton className="h-3 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-3">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive mb-2">{tStats("failedToLoadStats")}</p>
              <Button onClick={loadStats} variant="outline" size="sm">
                {tStats("retry")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Total Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("totalSessions")}</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>
                {stats.completed} {t("completed").toLowerCase()}
              </span>
            </div>
            {stats.incomplete > 0 && (
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-amber-500" />
                <span>
                  {stats.incomplete} {t("inProgress").toLowerCase()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Human Interviews */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("humanInterviews")}</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.humanSessions.total}</div>
          <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>
                {stats.humanSessions.completed} {t("completed").toLowerCase()}
              </span>
            </div>
            {stats.humanSessions.incomplete > 0 && (
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-amber-500" />
                <span>
                  {stats.humanSessions.incomplete} {t("inProgress").toLowerCase()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Interviews */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("aiInterviews")}</CardTitle>
          <Bot className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.personaSessions.total}</div>
          <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>
                {stats.personaSessions.completed} {t("completed").toLowerCase()}
              </span>
            </div>
            {stats.personaSessions.incomplete > 0 && (
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-amber-500" />
                <span>
                  {stats.personaSessions.incomplete} {t("inProgress").toLowerCase()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
