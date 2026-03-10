"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Pagination } from "@/components/ui/pagination";
import { ServerActionResult } from "@/lib/serverAction";
import { ArchiveIcon, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ReactNode, useCallback, useEffect, useState } from "react";

export function ArchiveDrawer<T>({
  fetchArchived,
  renderItem,
  pageSize = 12,
}: {
  fetchArchived: (params: { page: number; pageSize: number }) => Promise<
    ServerActionResult<T[]> & {
      pagination?: { page: number; pageSize: number; totalCount: number; totalPages: number };
    }
  >;
  renderItem: (item: T, onRefresh: () => void) => ReactNode;
  pageSize?: number;
}) {
  const t = useTranslations("Archive");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  } | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchArchived({ page, pageSize });
      if (result.success) {
        setItems(result.data);
        if (result.pagination) setPagination(result.pagination);
      } else {
        setItems([]);
        setPagination(null);
      }
    } catch {
      setItems([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [fetchArchived, page, pageSize]);

  useEffect(() => {
    if (open) loadItems();
  }, [open, loadItems]);

  const handleRefresh = () => {
    loadItems();
  };

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArchiveIcon className="size-3.5" />
          {t("archived")}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="w-[360px] sm:max-w-[360px] h-full mr-0 ml-auto">
        <DrawerHeader>
          <DrawerTitle className="text-sm">{t("archivedItems")}</DrawerTitle>
          {pagination && (
            <p className="text-[11px] text-muted-foreground">
              {t("itemsCount", { count: pagination.totalCount })}
            </p>
          )}
        </DrawerHeader>

        <div className="flex-1 flex flex-col overflow-hidden px-4">
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : items.length > 0 ? (
              <div className="space-y-3">
                {items.map((item) => renderItem(item, handleRefresh))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-xs text-muted-foreground">{t("noArchivedItems")}</p>
              </div>
            )}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="shrink-0 flex justify-center py-3">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
