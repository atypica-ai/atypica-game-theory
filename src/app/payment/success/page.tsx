import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function PaymentSuccessPage() {
  const t = useTranslations("PaymentPage");
  return (
    <div className="container mx-auto max-w-md py-12">
      <Card>
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-center text-2xl">{t("successTitle")}</CardTitle>
          <CardDescription className="text-center">{t("successContent")}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

// export default async function PaymentSuccessPage({
//   searchParams,
// }: {
//   searchParams: Promise<{ redirect: string }>;
// }) {
//   const redirectUrl = (await searchParams).redirect;
//   if (redirectUrl) {
//     redirect(redirectUrl);
//   }
//   redirect("/");
// }
