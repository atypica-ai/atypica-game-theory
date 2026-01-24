"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate, formatTokensNumber } from "@/lib/utils";
import { SearchIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { PaginationInfo } from "../types";
import { fetchInterviewProjects } from "./actions";

type InterviewProject = ExtractServerActionData<typeof fetchInterviewProjects>[number];

export const SearchParamsConfig = {
  page: createParamConfig.number(1),
  search: createParamConfig.string(""),
} as const;

export type InterviewsSearchParams = {
  page: number;
  search: string;
};

interface InterviewsPageClientProps {
  initialSearchParams: Record<string, string | number | boolean>;
}

export function InterviewsPageClient({ initialSearchParams }: InterviewsPageClientProps) {
  const { status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<InterviewProject[]>([]);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use search params hook for URL synchronization
  const {
    values: { page: currentPage, search: searchQuery },
    setParam,
    setParams,
  } = useListQueryParams<InterviewsSearchParams>({
    params: SearchParamsConfig,
    initialValues: initialSearchParams,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchInterviewProjects(currentPage, 10, searchQuery);
    if (!result.success) {
      setError(result.message);
    } else {
      setProjects(result.data);
      if (result.pagination) setPagination(result.pagination);
    }
    setIsLoading(false);
  }, [currentPage, searchQuery]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/interviews");
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

  const openSharePage = (token: string) => {
    window.open(`/interview/project/${token}/share`, "_blank");
  };

  if (status === "loading" || isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Interview Projects Management</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-500">{error}</div>}

      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              defaultValue={searchQuery}
              ref={inputRef}
              placeholder="Search by brief, token, or user email..."
              className="pl-8"
            />
          </div>
          <Button type="submit">Search</Button>
          {searchQuery && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.value = "";
                }
                setParams({ search: "", page: 1 });
              }}
            >
              Clear
            </Button>
          )}
        </form>
      </div>

      <div className="mb-4 overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Creator / Created</TableHead>
              <TableHead>Brief</TableHead>
              <TableHead>Sessions</TableHead>
              <TableHead className="text-right">Token Usage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {project.id}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="text-sm truncate">{project.userEmail}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(project.createdAt, locale)}
                    </p>
                  </div>
                </TableCell>
                {/* whitespace-normal allows text wrapping for line-clamp to work properly */}
                <TableCell className="whitespace-normal">
                  <div className="max-w-[30rem] xl:max-w-[60rem] overflow-hidden">
                    <div
                      className="text-sm font-medium line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => openSharePage(project.token)}
                      title="Click to view project details"
                    >
                      {project.brief}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-1 truncate">
                      {project.token}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {project.humanSessionsCount === 0 && project.aiPersonaSessionsCount === 0 ? (
                      <div className="text-sm font-semibold">0</div>
                    ) : (
                      <>
                        {project.humanSessionsCount > 0 && (
                          <div className="text-xs">
                            <span className="text-sm font-semibold">
                              {project.humanSessionsCount}
                            </span>{" "}
                            Humans
                          </div>
                        )}
                        {project.aiPersonaSessionsCount > 0 && (
                          <div className="text-xs">
                            <span className="text-sm font-semibold">
                              {project.aiPersonaSessionsCount}
                            </span>{" "}
                            AI
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="text-sm font-medium">
                    {formatTokensNumber(project.totalTokens)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {project.totalTokens.toLocaleString()} tokens
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setParam("page", page)}
          />
          <div className="text-sm text-muted-foreground">
            Total: {pagination.totalCount.toLocaleString()} projects
          </div>
        </div>
      )}
    </div>
  );
}
