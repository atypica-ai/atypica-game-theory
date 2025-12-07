"use client";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData, ServerActionResultPagination } from "@/lib/serverAction";
import { proxiedImageLoader } from "@/lib/utils";
import { AnalystKind } from "@/prisma/client";
import { ExternalLinkIcon, FileTextIcon, Loader2Icon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPublicFeaturedStudies } from "./actions";

type TStudies = ExtractServerActionData<typeof fetchPublicFeaturedStudies>;

export const SearchParamsConfig = {
  page: createParamConfig.number(1),
  kind: {
    defaultValue: "all" as AnalystKind | "all",
    serialize: (value: AnalystKind | "all") => value,
    deserialize: (value: string | null) => {
      if (!value) return "all" as AnalystKind | "all";
      return value as AnalystKind | "all";
    },
  },
} as const;

export type FeaturedStudiesSearchParams = {
  page: number;
  kind: AnalystKind | "all";
};

export default function FeaturedStudiesClient({
  initialSearchParams,
}: {
  initialSearchParams: Record<string, string | number>;
}) {
  const locale = useLocale();
  const t = useTranslations("FeaturedStudiesPage");
  const [studies, setStudies] = useState<TStudies>([]);
  const [pagination, setPagination] = useState<ServerActionResultPagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const {
    values: { page: currentPage, kind: activeAnalystKind },
    setParam,
    setParams,
  } = useListQueryParams<FeaturedStudiesSearchParams>({
    params: SearchParamsConfig,
    initialValues: initialSearchParams,
  });

  useEffect(() => {
    async function loadStudies() {
      setIsLoading(true);
      try {
        const result = await fetchPublicFeaturedStudies({
          locale,
          kind: activeAnalystKind === "all" ? undefined : activeAnalystKind,
          page: currentPage,
          pageSize: 12,
        });
        if (result.success) {
          setStudies(result.data);
          if (result.pagination) {
            setPagination(result.pagination);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadStudies();
  }, [activeAnalystKind, locale, currentPage]);

  const handleKindChange = (value: string) => {
    setParams({ kind: value as AnalystKind | "all", page: 1 });
  };

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

  if (isLoading) {
    return (
      <div className="py-4 md:py-6 px-4 md:px-6">
        <div className="flex flex-col items-center gap-4 md:gap-6 max-w-screen-2xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-center">{t("title")}</h1>
          <div className="flex justify-center py-8">
            <Loader2Icon className="size-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

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
          onValueChange={handleKindChange}
          className="mt-6 items-center hidden md:flex w-full"
        >
          <TabsList className="mb-6">
            {kinds.map((kind) => (
              <TabsTrigger key={kind} value={kind} className="capitalize">
                {getAnalystKindLabel(kind)}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={activeAnalystKind}>{renderStudyGrid(studies)}</TabsContent>
        </Tabs>

        {/* Mobile view: Dropdown select */}
        <div className="md:hidden w-full max-w-xs mt-6">
          <select
            value={activeAnalystKind}
            onChange={(e) => handleKindChange(e.target.value)}
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
        <div className="md:hidden w-full mt-4">{renderStudyGrid(studies)}</div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 w-full">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setParam("page", page)}
            />
            <div className="text-sm text-muted-foreground">
              Total: {pagination.totalCount.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
