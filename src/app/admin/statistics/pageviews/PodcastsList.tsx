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
import { AnalystPodcastExtra } from "@/prisma/client";
import { RefreshCwIcon } from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";

import { PageViewWithPodcast } from "./actions";

interface PodcastsListProps {
  data: PageViewWithPodcast[];
  isLoading: boolean;
}

export function PodcastsList({ data, isLoading }: PodcastsListProps) {
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
        <p className="text-lg font-semibold text-gray-500">No podcasts data found</p>
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
            <TableHead>Podcast</TableHead>
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
                  {/* Audio Icon/Badge */}
                  <div className="flex-shrink-0 pt-1">
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                      🎙️ Podcast
                    </span>
                  </div>

                  {/* Text Content */}
                  <div className="space-y-1 flex-1 overflow-hidden">
                    {pageView.podcast ? (
                      <>
                        {/* Title - Clickable */}
                        <Link
                          href={pageView.pagePath}
                          target="_blank"
                          className="block hover:text-blue-600 transition-colors"
                        >
                          <p className="font-medium text-sm line-clamp-2">
                            {(pageView.podcast.extra as AnalystPodcastExtra)?.metadata?.title ||
                              "Untitled Podcast"}
                          </p>
                        </Link>
                        {/* Script Preview - Not clickable */}
                        {pageView.podcast.script && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {pageView.podcast.script}
                          </p>
                        )}
                        {/* Path - Not clickable */}
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {pageView.pagePath}
                        </p>
                      </>
                    ) : (
                      <div>
                        <p className="font-medium text-muted-foreground truncate">
                          Unknown Podcast
                        </p>
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
                    {pageView.podcast?.analyst?.user?.email || "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pageView.podcast ? formatDate(pageView.podcast.createdAt, locale) : "N/A"}
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
