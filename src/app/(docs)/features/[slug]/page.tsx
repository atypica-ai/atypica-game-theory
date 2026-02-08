import { generatePageMetadata } from "@/lib/request/metadata";
import { promises as fs } from "fs";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import path from "path";
import { Streamdown } from "streamdown";
import { getDocBySlug } from "../../types";
import { docs } from "../docs-config";

// Generate static params for all docs
export function generateStaticParams() {
  return docs.map((doc) => ({
    slug: doc.slug,
  }));
}

// Generate metadata for each doc
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const isZh = locale === "zh-CN";

  const doc = getDocBySlug(docs, slug);

  if (!doc) {
    return {
      title: "Document Not Found",
    };
  }

  return generatePageMetadata({
    title: isZh ? doc.titleZh : doc.titleEn,
    description: isZh ? doc.descriptionZh : doc.descriptionEn,
    locale,
  });
}

// Doc page component
export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const isZh = locale === "zh-CN";

  const doc = getDocBySlug(docs, slug);

  if (!doc) {
    notFound();
  }

  // Read markdown file from filesystem
  const filePath = isZh ? doc.filePathZh : doc.filePathEn;
  const fullPath = path.join(process.cwd(), filePath);

  let content: string;
  try {
    content = await fs.readFile(fullPath, "utf-8");
  } catch (error) {
    console.error(`Failed to read file: ${fullPath}`, error);
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl w-full px-4 py-8">
      {/* Article */}
      <article className="prose prose-zinc dark:prose-invert max-w-none prose-headings:scroll-mt-20">
        <Streamdown
          mode="static" // static 模式可以大大提升渲染速度
          parseIncompleteMarkdown={false}
          isAnimating={false}
          cdnUrl={null}
        >
          {content}
        </Streamdown>
      </article>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t">
        <div className="flex justify-end items-center text-sm text-muted-foreground">
          <p>
            {isZh ? "最后更新" : "Last updated"}: {new Date().toLocaleDateString(locale)}
          </p>
        </div>
      </footer>
    </div>
  );
}
