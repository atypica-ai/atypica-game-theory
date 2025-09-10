"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { RefreshCwIcon } from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";

import { PageViewWithStudy } from "./actions";

interface StudiesListProps {
  data: PageViewWithStudy[];
  isLoading: boolean;
  actualDays: number;
  limit: number;
}

export function StudiesList({ data, isLoading, actualDays, limit }: StudiesListProps) {
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCwIcon className="h-6 w-6 animate-spin mr-2" />
        Loading page views data...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-lg font-semibold text-gray-500">No studies data found</p>
        <p className="text-sm text-muted-foreground">
          Try adjusting the time period or check if Google Analytics is properly configured.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Study</TableHead>
            <TableHead className="text-center">访问用户数</TableHead>
            <TableHead>Author / Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((pageView, index) => (
            <TableRow key={`${pageView.pagePath}-${index}`}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell className="whitespace-normal">
                <div className="flex items-start space-x-3 max-w-[30rem] xl:max-w-[60rem] overflow-hidden">
                  {/* Kind Badge */}
                  <div className="flex-shrink-0 pt-1">
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        pageView.study?.analyst.kind === "testing"
                          ? "bg-blue-100 text-blue-800"
                          : pageView.study?.analyst.kind === "planning"
                            ? "bg-green-100 text-green-800"
                            : pageView.study?.analyst.kind === "insights"
                              ? "bg-purple-100 text-purple-800"
                              : pageView.study?.analyst.kind === "creation"
                                ? "bg-orange-100 text-orange-800"
                                : pageView.study?.analyst.kind === "productRnD"
                                  ? "bg-cyan-100 text-cyan-800"
                                  : pageView.study?.analyst.kind === "misc"
                                    ? "bg-gray-100 text-gray-800"
                                    : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {pageView.study?.analyst.kind || "N/A"}
                    </span>
                  </div>

                  {/* Text Content */}
                  <div className="space-y-1 flex-1 overflow-hidden">
                    {pageView.study ? (
                      <>
                        {/* Title - Clickable */}
                        <Link
                          href={pageView.pagePath}
                          target="_blank"
                          className="block hover:text-blue-600 transition-colors"
                        >
                          <p className="font-medium text-sm line-clamp-2">
                            {pageView.study.title || "Untitled Study"}
                          </p>
                        </Link>
                        {/* Topic - Not clickable */}
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {pageView.study.analyst.topic}
                        </p>
                        {/* Path - Not clickable */}
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {pageView.pagePath}
                        </p>
                      </>
                    ) : (
                      <div>
                        <p className="font-medium text-muted-foreground truncate">Unknown Study</p>
                        <p className="text-xs font-mono truncate">{pageView.pagePath}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center font-semibold">
                {pageView.users.toLocaleString()}
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <p className="text-sm truncate">{pageView.study?.analyst.user?.email || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">
                    {pageView.study ? formatDate(pageView.study.createdAt, locale) : "N/A"}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
