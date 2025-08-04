"use client";

import { fetchInterviewSessions } from "@/app/(interviewProject)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn, formatDate } from "@/lib/utils";
import {
  BotIcon,
  CheckCircleIcon,
  ClockIcon,
  ExternalLinkIcon,
  MessageSquareIcon,
  UsersIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type InterviewSessionItem = ExtractServerActionData<typeof fetchInterviewSessions>[number];

export function InterviewSessionsSection({ projectId }: { projectId: number }) {
  const locale = useLocale();
  const t = useTranslations("InterviewProject.projectDetails");
  const tSessions = useTranslations("InterviewProject.sessions");
  const [sessions, setSessions] = useState<InterviewSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchInterviewSessions(projectId);
      if (!result.success) throw result;
      setSessions(result.data);
    } catch (error) {
      setError((error as Error).message || "Failed to fetch sessions");
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const isSessionCompleted = (session: InterviewSessionItem) => {
    return session.title && session.title.trim() !== "";
  };

  const getSessionDisplayName = (session: InterviewSessionItem) => {
    if (session.intervieweePersona) {
      return session.intervieweePersona.name;
    }
    if (session.intervieweeUser) {
      return session.intervieweeUser.name;
    }
    return `#${session.id}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("interviewSessions")}</CardTitle>
        <CardDescription>{t("sessionsDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
            <p className="text-muted-foreground">{tSessions("loadingSessions")}</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <MessageSquareIcon className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium text-destructive mb-2">
              {tSessions("loadingError")}
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadSessions} variant="outline" size="sm">
              {tSessions("retryButton")}
            </Button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquareIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{t("noInterviews")}</h3>
            <p className="text-muted-foreground">{t("noInterviewsDescription")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const isCompleted = isSessionCompleted(session);
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {session.intervieweePersona ? (
                      <Badge variant="secondary" className="text-xs w-20 flex-shrink-0">
                        <BotIcon className="h-3 w-3 mr-1" />
                        AI
                      </Badge>
                    ) : session.intervieweeUser ? (
                      <Badge variant="default" className="text-xs w-20 flex-shrink-0">
                        <UsersIcon className="h-3 w-3 mr-1" />
                        Human
                      </Badge>
                    ) : (
                      <div className="w-20 h-1" />
                    )}
                    <div className="flex items-center space-x-2">
                      <div>
                        <p className="font-medium text-sm">
                          {session.title
                            ? `${session.title} (${getSessionDisplayName(session)})`
                            : getSessionDisplayName(session)}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="mr-2">{formatDate(session.createdAt, locale)}</span>
                          {isCompleted ? (
                            <CheckCircleIcon className="h-3 w-3 text-green-500" />
                          ) : (
                            <ClockIcon className="h-3 w-3 text-amber-500" />
                          )}
                          <span
                            className={cn(
                              isCompleted
                                ? "text-green-600 dark:text-green-400"
                                : "text-amber-600 dark:text-amber-400",
                            )}
                          >
                            {isCompleted ? t("completed") : t("inProgress")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      href={`/interview/projects/${projectId}/sessions/${session.id}`}
                      target="_blank"
                    >
                      <ExternalLinkIcon className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
