"use client";
import { fetchPublicFeaturedStudies } from "@/app/admin/studies/actions";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExtractServerActionData } from "@/lib/serverAction";
import { proxiedImageLoader } from "@/lib/utils";
import { AnalystKind } from "@/prisma/types";
import { ExternalLinkIcon, FileTextIcon, Loader2Icon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type TStudies = ExtractServerActionData<typeof fetchPublicFeaturedStudies>;

export default function FeaturedStudiesClient() {
  const locale = useLocale();
  const t = useTranslations("FeaturedStudiesPage");
  const [studies, setStudies] = useState<TStudies>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAnalystKind, setActiveAnalystKind] = useState<AnalystKind | "all">("all");

  useEffect(() => {
    async function loadStudies() {
      setIsLoading(true);
      try {
        const result = await fetchPublicFeaturedStudies({
          locale,
          kind: activeAnalystKind === "all" ? undefined : activeAnalystKind,
          limit: 12,
        });
        if (result.success) {
          setStudies(result.data);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadStudies();
  }, [activeAnalystKind, locale]);

  // Filter studies by category
  const filteredStudies =
    activeAnalystKind === "all"
      ? studies
      : studies.filter((study) => study.analyst.kind === activeAnalystKind);

  const kinds: ("all" | AnalystKind)[] = [
    "all",
    AnalystKind.testing,
    AnalystKind.planning,
    AnalystKind.insights,
    AnalystKind.creation,
  ];

  const getAnalystKindLabel = (kind: "all" | AnalystKind | null) => {
    if (!kind) return "";
    switch (kind) {
      case "all":
        return t("kinds.all");
      case AnalystKind.testing:
        return t("kinds.testing");
      case AnalystKind.planning:
        return t("kinds.planning");
      case AnalystKind.insights:
        return t("kinds.insights");
      case AnalystKind.creation:
        return t("kinds.creation");
      default:
        return kind;
    }
  };

  const renderStudyGrid = (studies: TStudies) => {
    if (studies.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t("noStudies")}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full">
        {studies.map((study) => (
          <Card key={study.id} className="flex flex-col h-full group relative pb-0">
            <CardHeader className="flex items-center">
              <HippyGhostAvatar seed={study.id} className="shrink-0 size-8" />
              <CardTitle className="text-sm font-normal truncate">{study.analyst.role}</CardTitle>
              <div className="ml-auto text-xs md:text-sm text-muted-foreground">
                {getAnalystKindLabel(study.analyst.kind)}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="font-medium mb-2 line-clamp-1">{study.studyUserChat.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-3">{study.analyst.topic}</p>
            </CardContent>
            {study.analyst.latestReport?.coverUrl ? (
              <div className="relative aspect-video rounded-t-xl overflow-hidden mt-4 mx-16 border">
                <Image
                  loader={proxiedImageLoader} // mainland 加载 us s3 的资源需要 proxy
                  src={study.analyst.latestReport?.coverUrl}
                  alt="report cover"
                  fill
                  sizes="600px" // fill 模式下, 不能写 100%, 否则 nextjs 会按照 100vw 来构建 imageloader 上的 w 参数，这里其实最大 600px 够了
                  className="object-cover"
                />
              </div>
            ) : null}
            <Link
              prefetch={true}
              className="absolute inset-0 bg-background/30 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-xl cursor-pointer"
              href={`/study/${study.studyUserChat.token}/share?replay=1`}
            >
              <Button
                variant="secondary"
                size="sm"
                className="bg-transparent hover:bg-transparent rounded-full"
              >
                <FileTextIcon className="h-3 w-3" />
                <span>{t("viewStudy")}</span>
                <ExternalLinkIcon className="h-3 w-3" />
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="py-4 md:py-6 px-4 md:px-6">
      <div className=" flex flex-col items-center gap-4 md:gap-6 max-w-screen-2xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-center">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-center text-sm md:text-base max-w-lg">
          {t("description")}
        </p>

        {/* Desktop view: Tabs */}
        <Tabs
          defaultValue={"all" as AnalystKind | "all"}
          value={activeAnalystKind}
          onValueChange={(value) => setActiveAnalystKind(value as AnalystKind | "all")}
          className="mt-6 items-center hidden md:flex w-full"
        >
          <TabsList className="mb-6">
            {kinds.map((kind) => (
              <TabsTrigger key={kind} value={kind} className="capitalize">
                {getAnalystKindLabel(kind)}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={activeAnalystKind}>
            {isLoading ? (
              <div className="flex justify-center">
                <Loader2Icon className="size-8 animate-spin" />
              </div>
            ) : (
              renderStudyGrid(filteredStudies)
            )}
          </TabsContent>
        </Tabs>

        {/* Mobile view: Dropdown select */}
        <div className="md:hidden w-full max-w-xs mt-6">
          <select
            value={activeAnalystKind}
            onChange={(e) => setActiveAnalystKind(e.target.value as AnalystKind | "all")}
            className="w-full p-2 border rounded-md bg-background"
          >
            {kinds.map((kind) => (
              <option key={kind} value={kind} className="capitalize">
                {getAnalystKindLabel(kind)}
              </option>
            ))}
          </select>
        </div>

        {/* Mobile view: Content area */}
        <div className="md:hidden w-full mt-4">
          {isLoading ? (
            <div className="flex justify-center">
              <Loader2Icon className="size-8 animate-spin" />
            </div>
          ) : (
            renderStudyGrid(filteredStudies)
          )}
        </div>
      </div>
    </div>
  );
}
