import { BlogForm } from "../BlogForm";

export default function NewBlogPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Blog Article</h1>
        <p className="text-muted-foreground">Add a new article to the blog</p>
      </div>

      <BlogForm />
    </div>
  );
}
