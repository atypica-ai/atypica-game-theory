"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { throwServerActionError } from "@/lib/serverAction";
import type { BlogArticle, BlogArticleExtra } from "@/prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBlogArticle, updateBlogArticle } from "./actions";

interface BlogFormProps {
  article?: BlogArticle;
}

export function BlogForm({ article }: BlogFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: article?.title || "",
    content: article?.content || "",
    slug: article?.slug || "",
    locale: article?.locale || "en-US",
    publishedAt: article?.publishedAt
      ? new Date(article.publishedAt).toISOString().split("T")[0]
      : "",
    contentType: ((article?.extra as BlogArticleExtra)?.contentType || "html") as
      | "html"
      | "markdown",
    coverSrc: (article?.extra as BlogArticleExtra)?.coverSrc || "",
    originalUrl: (article?.extra as BlogArticleExtra)?.originalUrl || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const extra: BlogArticleExtra = {
        contentType: formData.contentType,
        coverSrc: formData.coverSrc || undefined,
        originalUrl: formData.originalUrl || undefined,
      };

      const data = {
        title: formData.title,
        content: formData.content,
        slug: formData.slug,
        locale: formData.locale,
        publishedAt: formData.publishedAt ? new Date(formData.publishedAt) : null,
        extra,
      };

      let result;
      if (article) {
        result = await updateBlogArticle(article.id, data);
      } else {
        result = await createBlogArticle(data);
      }

      if (!result.success) {
        throwServerActionError(result);
      }

      router.push("/admin/blog");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="locale">Locale</Label>
          <Select
            value={formData.locale}
            onValueChange={(value) => setFormData({ ...formData, locale: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en-US">English</SelectItem>
              <SelectItem value="zh-CN">Chinese</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contentType">Content Type</Label>
          <Select
            value={formData.contentType}
            onValueChange={(value: "html" | "markdown") =>
              setFormData({ ...formData, contentType: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="markdown">Markdown</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="publishedAt">Published Date</Label>
        <Input
          id="publishedAt"
          type="date"
          value={formData.publishedAt}
          onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="coverObjectUrl">Cover Image URL</Label>
        <Input
          id="coverObjectUrl"
          value={formData.coverSrc}
          onChange={(e) => setFormData({ ...formData, coverSrc: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="originalUrl">Original URL</Label>
        <Input
          id="originalUrl"
          value={formData.originalUrl}
          onChange={(e) => setFormData({ ...formData, originalUrl: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={20}
          className="font-mono text-sm"
          required
        />
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : article ? "Update Article" : "Create Article"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
