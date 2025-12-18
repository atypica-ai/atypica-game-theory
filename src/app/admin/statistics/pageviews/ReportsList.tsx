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
import Image from "next/image";
import Link from "next/link";

import { PageViewWithReport } from "./actions";

interface ReportsListProps {
  data: PageViewWithReport[];
  isLoading: boolean;
}

export function ReportsList({ data, isLoading }: ReportsListProps) {
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
        <p className="text-lg font-semibold text-gray-500">No reports data found</p>
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
            <TableHead>Report</TableHead>
            <TableHead className="text-center">访问用户数</TableHead>
            <TableHead>Author / Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((pageView, index) => (
            <TableRow key={`${pageView.pagePath}-${index}`}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell className="whitespace-normal">
                <div className="flex items-start space-x-3 max-w-120 xl:max-w-240 overflow-hidden">
                  {/* Cover Image - Clickable */}
                  {pageView.report?.coverUrl ? (
                    <Link
                      href={pageView.pagePath}
                      target="_blank"
                      className="relative w-40 h-24 shrink-0 overflow-hidden rounded border hover:opacity-80 transition-opacity"
                    >
                      <Image
                        src={pageView.report.coverUrl}
                        alt="report cover"
                        fill
                        className="object-cover"
                      />
                    </Link>
                  ) : (
                    <div className="w-40 h-24 shrink-0 rounded border border-dashed border-gray-300 flex items-center justify-center"></div>
                  )}

                  {/* Text Content */}
                  <div className="space-y-1 flex-1 overflow-hidden">
                    {pageView.report ? (
                      <>
                        {/* Brief - Clickable */}
                        <Link
                          href={pageView.pagePath}
                          target="_blank"
                          className="block hover:text-blue-600 transition-colors"
                        >
                          <p className="font-medium text-sm line-clamp-2">
                            {pageView.report.analyst.brief || "Untitled Report"}
                          </p>
                        </Link>
                        {/* Topic - Not clickable */}
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {pageView.report.analyst.topic}
                        </p>
                        {/* Path - Not clickable */}
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {pageView.pagePath}
                        </p>
                      </>
                    ) : (
                      <div>
                        <p className="font-medium text-muted-foreground truncate">Unknown Report</p>
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
                  <p className="text-sm truncate">
                    {pageView.report?.analyst.user?.email || "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pageView.report ? formatDate(pageView.report.createdAt, locale) : "N/A"}
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
