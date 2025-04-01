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
import { Analyst, FeaturedStudy, User, UserAnalyst } from "@prisma/client";
import { ArrowDown, ArrowUp, StarIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  fetchAnalysts,
  fetchFeaturedStudies,
  toggleFeaturedStatus,
  updateDisplayOrder,
} from "./actions";

type FeaturedStudyWithAnalyst = FeaturedStudy & {
  analyst: Analyst;
};

type AnalystWithFeature = Analyst & {
  userAnalysts: (UserAnalyst & {
    user: Pick<User, "email">;
  })[];
  featuredStudy: FeaturedStudy | null;
};

type PaginationInfo = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, currentPage]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [featuredResult, analystsResult] = await Promise.all([
        fetchFeaturedStudies(),
        fetchAnalysts(currentPage),
      ]);

      if (!featuredResult.success) {
        throw new Error(featuredResult.error || "Failed to fetch featured studies");
      }

      if (!analystsResult.success) {
        throw new Error(analystsResult.error || "Failed to fetch analysts");
      }

      setFeaturedStudies(featuredResult.data || []);
      setAnalysts(analystsResult.data || []);
      setPagination(analystsResult.pagination || null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFeatured = async (analyst: Analyst) => {
    try {
      const result = await toggleFeaturedStatus(analyst);

      if (!result.success) {
        throw new Error(result.error || "Failed to toggle featured status");
      }

      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleMoveOrder = async (id: number, direction: "up" | "down") => {
    try {
      const result = await updateDisplayOrder(id, direction);

      if (!result.success) {
        throw new Error(result.error || "Failed to update display order");
      }

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
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Study Topic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {featuredStudies.map((study, index) => (
                  <tr key={study.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <span>{study.displayOrder}</span>
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
                    <td className="px-6 py-4 text-sm text-gray-900">{study.analyst.topic}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {study.analyst.role}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleToggleFeatured(study.analyst)}
                      >
                        Remove
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
                <p className="text-sm text-gray-500">
                  User: {analyst.userAnalysts[0]?.user?.email || "N/A"}
                </p>
                <p className="text-sm text-gray-500">
                  Created: {new Date(analyst.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  variant={analyst.featuredStudy ? "destructive" : "default"}
                  onClick={() => handleToggleFeatured(analyst)}
                  className="w-full"
                >
                  {analyst.featuredStudy ? "Remove from Featured" : "Add to Featured"}
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
