import { Button } from "@/components/ui/button";
import { FileQuestionIcon } from "lucide-react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      <div className="max-w-md mx-auto px-4 py-8 text-center">
        <div className="inline-block animate-pulse rounded-full bg-primary/10 p-6 mb-6">
          <FileQuestionIcon className="size-12 text-primary" />
        </div>

        <h1 className="text-4xl font-medium tracking-tight mb-4 bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
          404 页面未找到
        </h1>

        <p className="text-muted-foreground mb-8">
          很抱歉，您访问的页面不存在或已被移除。请检查URL是否正确或返回首页。
        </p>

        <div className="space-y-4">
          <Button variant="outline" asChild>
            <Link href="/" className="inline-flex items-center">
              返回首页
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
