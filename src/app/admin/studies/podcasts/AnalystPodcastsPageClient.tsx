"use client";
import { PaginationInfo } from "@/app/admin/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Switch } from "@/components/ui/switch";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData } from "@/lib/serverAction";
import { FlaskConicalIcon, SearchIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { fetchAnalystPodcastsAction } from "./actions";
import { PodcastCard } from "./PodcastCard";

type AnalystPodcastWithAnalyst = ExtractServerActionData<typeof fetchAnalystPodcastsAction>[number];

export const SearchParamsConfig = {
  page: createParamConfig.number(1),
  search: createParamConfig.string(""),
  featured: createParamConfig.boolean(false),
} as const;

export type AnalystPodcastsSearchParams = {
  page: number;
  search: string;
  featured: boolean;
};

interface AnalystPodcastsPageClientProps {
  initialSearchParams: Record<string, string | number>;
}

export function AnalystPodcastsPageClient({ initialSearchParams }: AnalystPodcastsPageClientProps) {
  const { status } = useSession();
  const router = useRouter();
  const [analystPodcasts, setAnalystPodcasts] = useState<AnalystPodcastWithAnalyst[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use search params hook for URL synchronization
  const {
    values: { page: currentPage, search: searchQuery, featured: featuredOnly },
    setParam,
    setParams,
  } = useListQueryParams<AnalystPodcastsSearchParams>({
    params: SearchParamsConfig,
    initialValues: initialSearchParams,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchAnalystPodcastsAction(currentPage, 12, searchQuery, featuredOnly);
    if (!result.success) {
      setError(result.message);
    } else {
      setAnalystPodcasts(result.data);
      if (result.pagination) setPagination(result.pagination);
    }
    setIsLoading(false);
  }, [currentPage, searchQuery, featuredOnly]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/studies/podcasts");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, fetchData]);

  const handleSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setParams({ search: inputRef.current?.value ?? "", page: 1 }); // Reset to first page on new search
    },
    [setParams],
  );

  const handlePodcastUpdate = useCallback((updatedPodcast: AnalystPodcastWithAnalyst) => {
    setAnalystPodcasts((prev) =>
      prev.map((podcast) => (podcast.id === updatedPodcast.id ? updatedPodcast : podcast)),
    );
  }, []);

  const handleError = useCallback((message: string) => {
    setError(message);
  }, []);

  if (status === "loading" || isLoading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analyst Podcasts Management</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/studies/podcasts/test" className="flex items-center gap-2">
            <FlaskConicalIcon className="h-4 w-4" />
            Podcast Test
          </Link>
        </Button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-500">{error}</div>}

      <form onSubmit={handleSearch} className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            defaultValue={searchQuery}
            ref={inputRef}
            placeholder="Search by token, topic, or email..."
            className="pl-8"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="featured-only"
            checked={featuredOnly}
            onCheckedChange={(checked) => setParams({ featured: checked, page: 1 })}
          />
          <Label htmlFor="featured-only">Featured only</Label>
        </div>
        <Button type="submit">Search</Button>
        {(searchQuery || featuredOnly) && (
          <Button
            variant="outline"
            onClick={() => {
              if (inputRef.current) {
                inputRef.current.value = "";
              }
              setParams({ search: "", featured: false, page: 1 });
            }}
          >
            Clear Filters
          </Button>
        )}
      </form>

      <div className="mb-4">
        {(searchQuery || featuredOnly) && (
          <div className="mb-4 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Active filters:</span>
            {searchQuery && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Search: {searchQuery}
              </span>
            )}
            {featuredOnly && (
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Featured only</span>
            )}
          </div>
        )}
        {analystPodcasts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-lg font-semibold text-gray-500">
              {searchQuery
                ? `No analyst podcasts found for query "${searchQuery}"`
                : "No analyst podcasts found"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analystPodcasts.map((podcast) => (
              <PodcastCard
                key={podcast.id}
                podcast={podcast}
                onUpdate={handlePodcastUpdate}
                onError={handleError}
              />
            ))}
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setParam("page", page)}
          />
          {pagination.totalCount > 0 && (
            <div className="text-sm text-muted-foreground">
              Total: {pagination.totalCount.toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
