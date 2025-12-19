import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { AWSMarketplaceSignupForm } from "./signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return generatePageMetadata({
    title: "AWS Marketplace Signup",
    description: "Complete your AWS Marketplace registration",
  });
}

export default async function AWSMarketplaceSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ customerIdentifier?: string; productCode?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("Auth");

  if (!params.customerIdentifier || !params.productCode) {
    return (
      <div className="container mx-auto py-10">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Registration</h1>
          <p className="text-muted-foreground">
            Invalid AWS Marketplace registration parameters. Please try again from AWS Marketplace.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Complete Your AWS Marketplace Registration</h1>
        <Suspense fallback={<div>Loading...</div>}>
          <AWSMarketplaceSignupForm
            customerIdentifier={params.customerIdentifier}
            productCode={params.productCode}
          />
        </Suspense>
      </div>
    </div>
  );
}
