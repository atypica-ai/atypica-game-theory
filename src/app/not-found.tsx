import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { Button } from "@/components/ui/button";
import { FileQuestionIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function NotFoundPage() {
  const t = useTranslations("NotFoundPage");
  return (
    <DefaultLayout header={true} footer={true}>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="max-w-md mx-auto px-4 py-8 text-center">
          <div className="inline-block animate-pulse rounded-full bg-primary/10 p-6 mb-6">
            <FileQuestionIcon className="size-12 text-primary" />
          </div>

          <h1 className="text-4xl font-medium tracking-tight mb-4 bg-linear-to-r from-primary/80 to-primary bg-clip-text text-transparent">
            {t("title")}
          </h1>

          <p className="text-muted-foreground mb-8">{t("description")}</p>

          <div className="space-y-4">
            <Button variant="outline" asChild>
              <Link href="/" className="inline-flex items-center">
                {t("returnHome")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}
