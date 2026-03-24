import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftIcon, Building2Icon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";

export async function AwsMarketplacePricingView() {
  const t = await getTranslations("PricingPage.awsMarketplace");

  return (
    <div className="px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/60 px-4 py-2 text-sm font-medium text-muted-foreground">
            <Building2Icon className="size-4" />
            {t("badge")}
          </div>
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">{t("description")}</p>
        </div>

        <Card className="not-dark:border-primary/20 border-2">
          <CardHeader>
            <CardTitle className="text-2xl">{t("cardTitle")}</CardTitle>
            <CardDescription className="text-base">{t("cardDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href="https://signin.aws.amazon.com/console" target="_blank" rel="noreferrer">
                <Image src="/_public/icon-aws.png" alt="AWS" width={20} height={20} />
                <span>{t("goToAws")}</span>
              </Link>
            </Button>
            <Link
              href="/account"
              className="flex items-center justify-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t("goToAccount")}
              <ArrowLeftIcon className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
