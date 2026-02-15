"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { throwServerActionError } from "@/lib/serverAction";
import type { BlogArticle } from "@/prisma/client";
import { Locale } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteBlogArticle, fetchBlogArticles } from "./actions";

export function BlogListClient() {
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [locale, setLocale] = useState<Locale | "all">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const loadArticles = async () => {
    setIsLoading(true);
    try {
      const result = await fetchBlogArticles({
        locale: locale === "all" ? undefined : locale,
        page,
        pageSize: 20,
      });

      if (!result.success) {
        throwServerActionError(result);
      }

      setArticles(result.data);
      if (result.pagination) {
        setTotalPages(result.pagination.totalPages);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, page]);

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this article?")) {
      return;
    }

    const result = await deleteBlogArticle(id);
    if (!result.success) {
      throwServerActionError(result);
    }

    await loadArticles();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select
          value={locale}
          onValueChange={(locale: Locale | "all") => {
            setLocale(locale);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select locale" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locales</SelectItem>
            <SelectItem value="en-US">English</SelectItem>
            <SelectItem value="zh-CN">Chinese</SelectItem>
          </SelectContent>
        </Select>

        <Button asChild>
          <Link href="/admin/blog/new">Create New Article</Link>
        </Button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Locale</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell>{article.id}</TableCell>
                  <TableCell className="max-w-xs truncate">{article.title}</TableCell>
                  <TableCell>{article.slug}</TableCell>
                  <TableCell>{article.locale}</TableCell>
                  <TableCell>
                    {article.publishedAt
                      ? new Date(article.publishedAt).toLocaleDateString()
                      : "Not published"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/blog/${article.id}`}>Edit</Link>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(article.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
