import { Suspense } from "react";
import { BlogListClient } from "./BlogListClient";

export default async function BlogAdminPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Blog Management</h1>
          <p className="text-muted-foreground">Manage blog articles</p>
        </div>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <BlogListClient />
      </Suspense>
    </div>
  );
}
