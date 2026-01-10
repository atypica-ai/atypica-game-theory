import { notFound } from "next/navigation";
import { getBlogArticle } from "../actions";
import { BlogForm } from "../BlogForm";

export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const articleId = parseInt(id);

  if (isNaN(articleId)) {
    notFound();
  }

  const result = await getBlogArticle(articleId);

  if (!result.success) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Blog Article</h1>
        <p className="text-muted-foreground">Update article details</p>
      </div>

      <BlogForm article={result.data} />
    </div>
  );
}
