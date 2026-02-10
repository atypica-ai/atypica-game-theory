"use client";

import { searchArtifactsAction } from "@/app/(search)/actions";
import { ArtifactDocument, ArtifactType } from "@/app/(search)/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { formatDate } from "@/lib/utils";
import { SearchIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

export const SearchParamsConfig = {
  page: createParamConfig.number(1),
  query: createParamConfig.string(""),
  type: createParamConfig.string("all"),
  kind: createParamConfig.string("all"),
} as const;

export type SearchParams = {
  page: number;
  query: string;
  type: string;
  kind: string;
};

interface SearchPageClientProps {
  initialSearchParams: Record<string, string | number | boolean>;
}

export function SearchPageClient({ initialSearchParams }: SearchPageClientProps) {
  const { status } = useSession();
  const currentLocale = useLocale();
  const router = useRouter();
  const [artifacts, setArtifacts] = useState<ArtifactDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalHits, setTotalHits] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);

  const {
    values: { page, query, type, kind },
    setParams,
  } = useListQueryParams<SearchParams>({
    params: SearchParamsConfig,
    initialValues: initialSearchParams,
  });

  // 本地表单状态
  const [formQuery, setFormQuery] = useState(query);
  const [formType, setFormType] = useState(type);
  const [formKind, setFormKind] = useState(kind);

  // 当 URL 参数变化时同步更新本地表单状态（例如浏览器前进/后退）
  useEffect(() => {
    setFormQuery(query);
    setFormType(type);
    setFormKind(kind);
  }, [query, type, kind]);

  const fetchData = useCallback(async () => {
    if (!query || query.trim() === "") {
      setArtifacts([]);
      setTotalHits(0);
      return;
    }

    setIsLoading(true);
    setError("");

    const result = await searchArtifactsAction({
      query: query.trim(),
      type: type && type !== "all" ? (type as ArtifactType) : undefined,
      kind: kind && kind !== "all" ? kind : undefined,
      page,
      pageSize: 20,
    });

    if (!result.success) {
      setError(result.message);
      setArtifacts([]);
    } else {
      setArtifacts(result.data.hits);
      setTotalHits(result.data.totalHits);
      setProcessingTime(result.data.processingTimeMs);
    }
    setIsLoading(false);
  }, [query, type, kind, page]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/studies/search");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, fetchData]);

  const handleSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      // 批量更新 URL 参数，触发搜索
      setParams({
        query: formQuery,
        type: formType,
        kind: formKind,
        page: 1,
      });
    },
    [formQuery, formType, formKind, setParams],
  );

  if (status === "loading" || status === "unauthenticated") {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 搜索表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SearchIcon className="h-5 w-5" />
            搜索 Artifacts（Reports & Podcasts）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 搜索关键词 */}
              <div className="md:col-span-3">
                <Label htmlFor="query">搜索关键词</Label>
                <div className="flex gap-2">
                  <Input
                    id="query"
                    type="text"
                    placeholder="输入标题、描述或标签..."
                    value={formQuery}
                    onChange={(e) => setFormQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isLoading}>
                    <SearchIcon className="h-4 w-4 mr-2" />
                    搜索
                  </Button>
                </div>
              </div>

              {/* 类型过滤 */}
              <div>
                <Label htmlFor="type">类型</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="podcast">Podcast</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Kind 过滤 */}
              <div>
                <Label htmlFor="kind">Kind</Label>
                <Select value={formKind} onValueChange={setFormKind}>
                  <SelectTrigger id="kind">
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="productRnD">Product R&D</SelectItem>
                    <SelectItem value="fastInsight">Fast Insight</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                    <SelectItem value="insights">Insights</SelectItem>
                    <SelectItem value="creation">Creation</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="misc">Misc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>

          {/* 搜索统计 */}
          {totalHits > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              找到 {totalHits} 个结果，耗时 {processingTime}ms
            </div>
          )}

          {error && <div className="mt-4 text-sm text-destructive">{error}</div>}
        </CardContent>
      </Card>

      {/* 搜索结果 */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">搜索中...</div>
      ) : artifacts.length === 0 ? (
        query && (
          <div className="text-center py-8 text-muted-foreground">
            没有找到相关结果，请尝试其他关键词
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {artifacts.map((artifact) => (
            <ArtifactCard key={artifact.slug} artifact={artifact} locale={currentLocale} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Artifact 卡片组件
 * 简化版：只显示搜索字段，完整数据需要从数据库查询
 */
function ArtifactCard({
  artifact,
  locale,
}: {
  artifact: ArtifactDocument;
  locale: string;
}) {
  // 从 slug 中提取真实的数据库 ID (格式: "report-1" 或 "podcast-2")
  const match = artifact.slug.match(/^(report|podcast)-(\d+)$/);
  const realId = match ? parseInt(match[2], 10) : 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base line-clamp-2">{artifact.title || "无标题"}</CardTitle>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
              {artifact.type === "report" ? "Report" : "Podcast"}
            </span>
            {artifact.kind && (
              <span className="px-2 py-0.5 rounded bg-secondary">{artifact.kind}</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 描述 */}
        {artifact.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">{artifact.description}</p>
        )}

        {/* 元数据 */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>创建时间: {formatDate(new Date(artifact.createdAt), locale as "zh-CN" | "en-US")}</div>
          <div>ID: {realId}</div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => {
              // 这里需要前端通过 slug 查询完整数据后再跳转
              // 或者直接在 admin 列表页实现搜索
              navigator.clipboard.writeText(artifact.slug);
            }}
          >
            复制 Slug
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
