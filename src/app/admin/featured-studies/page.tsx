"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Analyst, FeaturedStudy, User, UserAnalyst, UserChat } from "@prisma/client";
import { ArrowDown, ArrowUp, StarIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PaginationInfo } from "../utils";
import {
  fetchAnalysts,
  fetchFeaturedStudies,
  toggleFeaturedStatus,
  updateDisplayOrder,
} from "./actions";

type FeaturedStudyWithAnalyst = FeaturedStudy & {
  analyst: Analyst;
  studyUserChat: Pick<UserChat, "token">;
};

type AnalystWithFeature = Analyst & {
  userAnalysts: (UserAnalyst & {
    user: Pick<User, "email">;
  })[];
  featuredStudy: FeaturedStudy | null;
  studyUserChat: Pick<UserChat, "token"> | null;
};

export default function FeaturedStudiesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [featuredStudies, setFeaturedStudies] = useState<FeaturedStudyWithAnalyst[]>([]);
  const [analysts, setAnalysts] = useState<AnalystWithFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  // Initialize page from URL on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const pageParam = url.searchParams.get("page");
      if (pageParam) {
        setCurrentPage(parseInt(pageParam, 10));
      }
    }
  }, []);
  // Update URL when page changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", currentPage.toString());
    window.history.pushState({}, "", url.toString());
  }, [currentPage]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [featuredResult, analystsResult] = await Promise.all([
        fetchFeaturedStudies(),
        fetchAnalysts(currentPage),
      ]);
      setFeaturedStudies(featuredResult.data);
      setAnalysts(analystsResult.data);
      setPagination(analystsResult.pagination);
    } catch (err) {
      setError((err as Error).message);
    }
    setIsLoading(false);
  }, [currentPage]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, fetchData]);

  const handleToggleFeatured = async (analyst: Analyst) => {
    try {
      await toggleFeaturedStatus(analyst);
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleMoveOrder = async (id: number, direction: "up" | "down") => {
    try {
      await updateDisplayOrder(id, direction);
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
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
        <h2 className="mb-4 text-xl font-semibold">Current Featured Studies</h2>
        {featuredStudies.length === 0 ? (
          <p className="text-gray-500">No featured studies currently selected.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Study Topic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide">
                {featuredStudies.map((study, index) => (
                  <tr key={study.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {/* <span>{study.displayOrder}</span> */}
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleMoveOrder(study.id, "up")}
                            disabled={index === 0}
                            className="disabled:opacity-30"
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            onClick={() => handleMoveOrder(study.id, "down")}
                            disabled={index === featuredStudies.length - 1}
                            className="disabled:opacity-30"
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{study.analyst.topic}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">{study.analyst.role}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm space-x-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleToggleFeatured(study.analyst)}
                      >
                        Remove
                      </Button>
                      <Button variant="outline" asChild>
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

      <div className="mb-4">
        <h2 className="mb-4 text-xl font-semibold">All Studies</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {analysts.map((analyst) => (
            <Card
              key={analyst.id}
              className={analyst.featuredStudy ? "border-2 border-blue-400" : ""}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between w-full overflow-hidden">
                  <span className="truncate">{analyst.topic}</span>
                  {analyst.featuredStudy && (
                    <StarIcon className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  )}
                </CardTitle>
                <CardDescription>{analyst.role}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm line-clamp-3 mb-2">{analyst.studySummary}</p>
                <p className="text-sm text-muted-foreground">
                  User: {analyst.userAnalysts[0]?.user.email || "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(analyst.createdAt).toLocaleDateString()}
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
