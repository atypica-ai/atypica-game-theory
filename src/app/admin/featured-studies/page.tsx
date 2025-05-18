"use client";
import { FeaturedStudyCategory } from "@/app/(public)/featured-studies/data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { Analyst } from "@/prisma/client";
import { ArrowDown, ArrowUp, SearchIcon, StarIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { PaginationInfo } from "../utils";
import {
  fetchAnalysts,
  fetchFeaturedStudies,
  toggleFeaturedStatus,
  updateCategory,
  updateDisplayOrder,
  updatePositionDirect,
} from "./actions";

type AnalystWithFeature = ExtractServerActionData<typeof fetchAnalysts>[number];
type FeaturedStudyWithAnalyst = ExtractServerActionData<typeof fetchFeaturedStudies>[number];

export default function FeaturedStudiesPage() {
  const { status } = useSession();
  const locale = useLocale();
  const router = useRouter();
  const [featuredStudies, setFeaturedStudies] = useState<FeaturedStudyWithAnalyst[]>([]);
  const [analysts, setAnalysts] = useState<AnalystWithFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize page from URL on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const pageParam = url.searchParams.get("page");
      const searchParam = url.searchParams.get("search");
      if (pageParam) {
        setCurrentPage(parseInt(pageParam, 10));
      }
      if (searchParam) {
        setSearchQuery(searchParam);
      }
    }
  }, []);
  // Update URL when page changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", currentPage.toString());
    if (searchQuery) {
      url.searchParams.set("search", searchQuery);
    } else {
      url.searchParams.delete("search");
    }
    window.history.pushState({}, "", url.toString());
  }, [currentPage, searchQuery]);

  const handleSearch = useCallback((e: FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    setSearchQuery(inputRef.current?.value ?? "");
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [featuredResult, analystsResult] = await Promise.all([
      fetchFeaturedStudies(),
      fetchAnalysts(currentPage, searchQuery),
    ]);
    if (!featuredResult.success) {
      setError(featuredResult.message);
    } else {
      setFeaturedStudies(featuredResult.data);
    }
    if (!analystsResult.success) {
      setError(analystsResult.message);
    } else {
      setAnalysts(analystsResult.data);
      if (analystsResult.pagination) setPagination(analystsResult.pagination);
    }
    setIsLoading(false);
  }, [currentPage, searchQuery]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/featured-studies");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, fetchData]);

  const handleToggleFeatured = async (analyst: Analyst) => {
    const result = await toggleFeaturedStatus(analyst);
    if (!result.success) {
      setError(result.message);
    } else {
      await fetchData();
    }
  };

  const handleMoveOrder = async (id: number, direction: "up" | "down") => {
    const result = await updateDisplayOrder(id, direction);
    if (!result.success) {
      setError(result.message);
    } else {
      await fetchData();
    }
  };

  const handleCategoryChange = async (id: number, category: string) => {
    const result = await updateCategory(id, category as FeaturedStudyCategory);
    if (!result.success) {
      setError(result.message);
    } else {
      await fetchData();
    }
  };
  const handlePositionChange = async (id: number, newPosition: number) => {
    const result = await updatePositionDirect(id, newPosition);
    if (!result.success) {
      setError(result.message);
    } else {
      await fetchData();
    }
  };

  if (status === "loading" || isLoading) {
    return <div className="container mt-8">Loading...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Featured Studies Management</h1>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-500">{error}</div>}

      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Featured Studies</h2>
        {featuredStudies.length === 0 ? (
          <p className="text-gray-500">No featured studies currently selected.</p>
        ) : (
          <div className="max-h-[400px] overflow-y-auto overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Study Topic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide">
                {featuredStudies.map((study, index) => (
                  <tr key={study.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-18">
                          <Input
                            type="number"
                            min="1"
                            max={featuredStudies.length}
                            defaultValue={study.displayOrder}
                            className="h-7 text-xs w-full"
                            onBlur={(e) => {
                              const newPos = parseInt(e.target.value, 10);
                              if (!isNaN(newPos) && newPos !== study.displayOrder) {
                                handlePositionChange(study.id, newPos);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.currentTarget.blur();
                              }
                            }}
                          />
                        </div>
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleMoveOrder(study.id, "up")}
                            disabled={index === 0}
                            className="disabled:opacity-30"
                          >
                            <ArrowUp className="size-3" />
                          </button>
                          <button
                            onClick={() => handleMoveOrder(study.id, "down")}
                            disabled={index === featuredStudies.length - 1}
                            className="disabled:opacity-30"
                          >
                            <ArrowDown className="size-3" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs">{study.analyst.topic}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-xs">{study.analyst.role}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-xs">
                      <Select
                        defaultValue={study.category || "GENERAL"}
                        onValueChange={(value) => handleCategoryChange(study.id, value)}
                      >
                        <SelectTrigger size="sm" className="w-36 text-xs">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(FeaturedStudyCategory).map((category) => (
                            <SelectItem key={category} value={category} className="text-xs">
                              {category.charAt(0) + category.slice(1).toLowerCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-xs space-x-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleToggleFeatured(study.analyst)}
                      >
                        Remove
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs" asChild>
                        <Link
                          href={`/study/${study.studyUserChat.token}/share?replay=1`}
                          target="_blank"
                        >
                          View Study
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form onSubmit={handleSearch} className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            defaultValue={searchQuery}
            ref={inputRef}
            placeholder="Search by email or topic..."
            className="pl-8"
          />
        </div>
        <Button type="submit">Search</Button>
        {searchQuery && (
          <Button
            variant="outline"
            onClick={() => {
              if (inputRef.current) {
                inputRef.current.value = "";
              }
              setSearchQuery("");
              setCurrentPage(1);
            }}
          >
            Clear Search
          </Button>
        )}
      </form>

      <div className="mb-4">
        <h2 className="mb-4 text-xl font-semibold">All Studies</h2>
        {searchQuery && (
          <div className="mb-4 text-sm text-muted-foreground">
            Filtering by email or topic: <span className="font-medium">{searchQuery}</span>
          </div>
        )}
        {analysts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-lg font-semibold text-gray-500">
              {searchQuery ? `No studies found for query "${searchQuery}"` : "No studies found"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analysts.map((analyst) => (
              <Card
                key={analyst.id}
                className={analyst.featuredStudy ? "border-2 border-blue-400" : ""}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between w-full overflow-hidden">
                    <div className="truncate leading-normal">{analyst.topic}</div>
                    {analyst.featuredStudy && (
                      <StarIcon className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    )}
                  </CardTitle>
                  <CardDescription>{analyst.role}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm line-clamp-3 mb-2">{analyst.studySummary}</p>
                  <p className="text-sm text-muted-foreground">
                    User: {analyst.user?.email || "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Created: {formatDate(analyst.createdAt, locale)}
                  </p>
                </CardContent>
                <CardFooter className="gap-2 items-center justify-end">
                  <Button
                    variant={analyst.featuredStudy ? "outline" : "outline"}
                    onClick={() => handleToggleFeatured(analyst)}
                  >
                    {analyst.featuredStudy ? "Remove from Featured" : "Add to Featured"}
                  </Button>
                  <Button variant="outline" asChild>
                    <Link
                      href={`/study/${analyst.studyUserChat?.token}/share?replay=1`}
                      target="_blank"
                    >
                      View Study
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
