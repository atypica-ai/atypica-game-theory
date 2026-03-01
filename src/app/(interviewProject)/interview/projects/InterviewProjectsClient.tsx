"use client";
import { fetchUserInterviewProjects } from "@/app/(interviewProject)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { InterviewProjectExtra } from "@/prisma/client";
import {
  BotIcon,
  BriefcaseIcon,
  CalendarIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function InterviewProjectsClient({ isCreateEnabled }: { isCreateEnabled: boolean }) {
  const locale = useLocale();
  const t = useTranslations("InterviewProject.projectsList");
  const [projects, setProjects] = useState<
    ExtractServerActionData<typeof fetchUserInterviewProjects>
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchUserInterviewProjects(searchQuery || undefined);
      if (!result.success) throw result;
      setProjects(result.data);
    } catch (error) {
      toast.error((error as Error).message || t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t, searchQuery]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearchQuery(inputRef.current?.value ?? "");
  };

  const clearSearch = () => {
    if (inputRef.current) inputRef.current.value = "";
    setSearchQuery("");
  };

  const NewProjectCard = () => (
    <Card className="transition-all duration-300 hover:shadow-md border-dashed border-primary/30 min-w-80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="bg-primary/20 rounded-full p-1">
            <PlusIcon className="size-4 text-primary" />
          </div>
          {t("newProject")}
        </CardTitle>
      </CardHeader>
      <CardContent className="mt-auto">
        <div className="text-sm text-muted-foreground text-center mb-4">
          {t("createFirstProject")}
        </div>
        {isCreateEnabled ? (
          <Button variant="secondary" className="w-full" size="sm" asChild>
            <Link href="/interview/projects/new">
              <PlusIcon className="size-3" />
              {t("newProject")}
            </Link>
          </Button>
        ) : (
          <Button variant="secondary" className="w-full" size="sm" asChild>
            <Link href="/pricing" className="underline underline-offset-3">
              {t("upgradeToMaxPlan")}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="container mx-auto px-8 py-12 max-w-6xl">
          <div className="flex justify-center items-center h-64">
            <Loader2Icon className="size-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-8 py-8">
      <div className="container mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded bg-primary text-primary-foreground mb-2">
            <BriefcaseIcon className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("description")}</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              defaultValue={searchQuery}
              placeholder={t("searchPlaceholder")}
              className="pl-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button type="submit">{t("search")}</Button>
        </form>

        {/* Projects Grid */}
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <NewProjectCard />
            {projects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle>
                    <div className="flex items-center text-xs gap-2 font-normal text-muted-foreground">
                      <CalendarIcon className="h-3 w-3" />
                      {formatDate(project.createdAt, locale)}
                    </div>
                  </CardTitle>
                  <CardDescription className="mt-3">
                    <div className="text-sm line-clamp-3 text-foreground font-medium">
                      {project.brief}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-0 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <UsersIcon className="h-3 w-3 mr-1" />
                      {project.sessionStats.humanSessions} {t("humanSessions")}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <BotIcon className="h-3 w-3 mr-1" />
                      {project.sessionStats.personaSessions} {t("aiSessions")}
                    </Badge>
                    {(() => {
                      const extra = project.extra as InterviewProjectExtra;
                      if (extra?.processing) {
                        return (
                          <Badge variant="outline" className="text-xs">
                            <SparklesIcon className="h-3 w-3 mr-1 animate-pulse" />
                            {t("optimizing")}
                          </Badge>
                        );
                      } else if (project.questions && project.questions.length > 0) {
                        return (
                          <Badge variant="outline" className="text-xs">
                            {project.questions.length} Questions
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link prefetch={true} href={`/interview/project/${project.token}`}>
                      {t("viewDetails")}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex justify-center">
            <NewProjectCard />
          </div>
        )}
      </div>
    </div>
  );
}
