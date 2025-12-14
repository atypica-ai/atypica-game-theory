import { fetchProductPricesAction, TProductPrices } from "@/app/payment/actions";
import { ProductName } from "@/app/payment/data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trackEvent } from "@/lib/analytics/segment";
import { CoinsIcon, CreditCardIcon, GiftIcon, LoaderCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PaymentProvider, usePay } from "./usePay";

interface AddTokensDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddTokensDialog = ({
  open,
  onOpenChange,
  // onSuccess
}: AddTokensDialogProps) => {
  const t = useTranslations("Components.AddTokensDialog");
  const locale = useLocale();
  const [productPrices, setProductPrices] = useState<TProductPrices | null>(null);

  const { createPaymentLink, loading, error } = usePay();

  useEffect(() => {
    fetchProductPricesAction().then(setProductPrices);
  }, []);

  const currency = locale === "zh-CN" ? "CNY" : "USD";
  const price = useMemo(() => {
    if (!productPrices) return "-";
    const sign = currency === "CNY" ? "¥" : "$";
    return `${sign}${productPrices["TOKENS1M"][currency]}`;
  }, [productPrices, currency]);

  useEffect(() => {
    if (!open) return;
    trackEvent("Product Viewed", { name: ProductName.TOKENS1M, currency });
  }, [open, currency]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="p-4 border rounded-lg mb-4 bg-secondary/30">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-semibold">{t("tokenPackage")}</div>
              <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                <CoinsIcon className="size-3" />
                <span className="flex-1">{t("oneMillionTokens")}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                <GiftIcon className="size-3" />
                <span className="flex-1">{t("oneMillionTokensBonus")}</span>
              </div>
            </div>
            <div className="text-xl font-bold">{price}</div>
          </div>
        </div>

        {error && <div className="text-red-500 text-sm text-center mb-4">{error}</div>}

        <DialogFooter className="flex-row justify-end items-center">
          <Link href="/pricing" className="text-sm flex items-center gap-2 mr-auto">
            <CreditCardIcon className="size-5" />
            {t("viewPricing")}
          </Link>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={() =>
              createPaymentLink({
                paymentProvider:
                  currency === "CNY" ? PaymentProvider.StripeCNY : PaymentProvider.Stripe,
                productName: ProductName.TOKENS1M,
              })
            }
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                {t("processing")}
              </>
            ) : (
              t("pay")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
