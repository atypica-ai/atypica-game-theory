import { previewUpgradeAction, upgradeSubscriptionAction } from "@/app/payment/(stripe)/actions";
import {
  fetchProductPricesAction,
  getAvailableCouponInfoAction,
  TProductPrices,
} from "@/app/payment/actions";
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
import { Subscription, SubscriptionPlan } from "@/prisma/client";
import {
  CalendarIcon,
  CoinsIcon,
  CreditCardIcon,
  GiftIcon,
  InfoIcon,
  LoaderCircle,
  StarIcon,
  TagIcon,
  TicketIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PaymentProvider, usePay } from "./usePay";

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  activeSubscription?: Subscription | null;
}

export const SubscriptionDialog = ({
  plan,
  open,
  onOpenChange,
  // onSuccess,
  activeSubscription,
}: SubscriptionDialogProps & { plan?: SubscriptionPlan }) => {
  if (open && !plan) {
    throw new Error("SubscriptionDialog requires a plan");
  }
  const t = useTranslations("Components.SubscriptionDialog");
  const locale = useLocale();
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [productPrices, setProductPrices] = useState<TProductPrices | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { createPaymentLink, loading: usePayLoading, error: usePayError } = usePay();

  // Coupon 选择：用户可以选用内置 coupon 或不选（在 Stripe 页面输入促销码）
  const [couponInfo, setCouponInfo] = useState<{ couponId: string; label: string } | null>(null);
  const [useCoupon, setUseCoupon] = useState(true); // 默认选中使用 coupon

  // 升级预览：显示实际支付金额
  const [upgradePreview, setUpgradePreview] = useState<{
    targetPrice: number;
    discount: number;
    finalPrice: number;
    currency: string;
  } | null>(null);

  useEffect(() => {
    setError(usePayError);
  }, [usePayError]);

  useEffect(() => {
    setLoading(usePayLoading);
  }, [usePayLoading]);

  useEffect(() => {
    fetchProductPricesAction().then(setProductPrices);
    getAvailableCouponInfoAction().then(setCouponInfo);
  }, []);

  const currency = locale === "zh-CN" ? "CNY" : "USD";
  const price = useMemo(() => {
    if (!productPrices) return "-";
    const sign = currency === "CNY" ? "¥" : "$";
    switch (plan) {
      case SubscriptionPlan.pro:
        return `${sign}${productPrices["PRO1MONTH"][currency]}`;
      case SubscriptionPlan.max:
        return `${sign}${productPrices["MAX1MONTH"][currency]}`;
      case SubscriptionPlan.super:
        return `${sign}${productPrices["SUPER1MONTH"][currency]}`;
      default:
        return "-";
    }
  }, [plan, productPrices, currency]);

  useEffect(() => {
    if (!open) return;
    trackEvent("Product Viewed", {
      name:
        plan === SubscriptionPlan.pro
          ? ProductName.PRO1MONTH
          : plan === SubscriptionPlan.max
            ? ProductName.MAX1MONTH
            : plan === SubscriptionPlan.super
              ? ProductName.SUPER1MONTH
              : undefined,
      currency,
    });
  }, [open, plan, currency]);

  // 升级模式下，获取预览费用
  useEffect(() => {
    if (!open || !plan || !activeSubscription) return;
    const currentPlan = activeSubscription.plan;
    const canUpgrade =
      (currentPlan === SubscriptionPlan.pro &&
        (plan === SubscriptionPlan.max || plan === SubscriptionPlan.super)) ||
      (currentPlan === SubscriptionPlan.max && plan === SubscriptionPlan.super);
    if (!canUpgrade) {
      setUpgradePreview(null);
      return;
    }
    previewUpgradeAction({ targetPlan: plan }).then((result) => {
      if (result.success) setUpgradePreview(result.data);
    });
  }, [open, plan, activeSubscription]);

  const isUpgrade = useMemo(() => {
    if (!activeSubscription || !plan) return false;
    const currentPlan = activeSubscription.plan;
    if (currentPlan === SubscriptionPlan.pro && (plan === SubscriptionPlan.max || plan === SubscriptionPlan.super)) return true;
    if (currentPlan === SubscriptionPlan.max && plan === SubscriptionPlan.super) return true;
    return false;
  }, [activeSubscription, plan]);

  const upgradeOrCreatePaymentLink = useCallback(
    async ({
      paymentProvider,
      productName,
    }: {
      paymentProvider: PaymentProvider;
      productName: ProductName.MAX1MONTH | ProductName.PRO1MONTH | ProductName.SUPER1MONTH;
    }) => {
      if (isUpgrade) {
        setLoading(true);
        try {
          const result = await upgradeSubscriptionAction({ targetPlan: plan! });
          if (!result.success) throw result;
          setPaymentSuccess(true);
        } catch (error) {
          console.log("Error upgrading subscription:", error);
          setError((error as Error).message);
        } finally {
          setLoading(false);
        }
      } else {
        createPaymentLink({
          paymentProvider,
          productName,
          couponId: useCoupon && couponInfo ? couponInfo.couponId : undefined,
        });
      }
    },
    [createPaymentLink, isUpgrade, plan, useCoupon, couponInfo],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {plan === "pro"
              ? t("proTitle")
              : plan === "max"
                ? t("maxTitle")
                : plan === "super"
                  ? t("superTitle")
                  : "-"}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {paymentSuccess ? (
          <>
            <div className="text-green-500 font-semibold text-xl text-center my-6">
              {t("paymentSuccess")}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onOpenChange(false);
                  window.location.reload();
                }}
              >
                {t("refreshPage")}
              </Button>
              <Button type="button" disabled={loading} asChild>
                <Link href="/account">{t("goToAccount")}</Link>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {isUpgrade && (
              <div className="p-3 border rounded-lg mb-1 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-2">
                  <InfoIcon className="size-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-blue-800">
                    <div className="text-sm font-medium mb-1">{t("upgradeNotice.title")}</div>
                    <div className="text-xs text-blue-700">{t("upgradeNotice.description")}</div>
                    {upgradePreview && (
                      <div className="mt-2 text-xs text-blue-800 space-y-0.5">
                        <div className="flex justify-between">
                          <span>{t("upgradeNotice.targetPrice")}</span>
                          <span>
                            {upgradePreview.currency === "CNY" ? "¥" : "$"}
                            {upgradePreview.targetPrice}
                          </span>
                        </div>
                        {upgradePreview.discount > 0 && (
                          <div className="flex justify-between">
                            <span>{t("upgradeNotice.tokenCredit")}</span>
                            <span>
                              -{upgradePreview.currency === "CNY" ? "¥" : "$"}
                              {upgradePreview.discount.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold border-t border-blue-300 pt-1 mt-1">
                          <span>{t("upgradeNotice.totalDue")}</span>
                          <span>
                            {upgradePreview.currency === "CNY" ? "¥" : "$"}
                            {upgradePreview.finalPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 border rounded-lg mb-4 bg-secondary/30">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    <StarIcon className="size-4 text-primary" />
                    {plan === "pro"
                      ? t("proSubscription")
                      : plan === "max"
                        ? t("maxSubscription")
                        : plan === "super"
                          ? t("superSubscription")
                          : "-"}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="size-3" />
                    <span className="flex-1">{t("monthlySubscription")}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <CoinsIcon className="size-3" />
                    <span className="flex-1">
                      {plan === "pro"
                        ? t("proMonthlyTokens")
                        : plan === "max"
                          ? t("maxMonthlyTokens")
                          : plan === "super"
                            ? t("superMonthlyTokens")
                            : "-"}
                    </span>
                  </div>
                  {plan !== "super" && (
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                      <GiftIcon className="size-3" />
                      <span className="flex-1">
                        {plan === "pro" ? t("proGift") : plan === "max" ? t("maxGift") : "-"}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-xl font-bold">{price}</span>
                  <span className="text-sm font-normal">/{t("month")}</span>
                </div>
              </div>
            </div>

            {couponInfo && !isUpgrade && (
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setUseCoupon(true)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                    useCoupon
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <TagIcon className="size-3.5 shrink-0" />
                  <span>{t("couponChoice.useAutoCoupon", { coupon: couponInfo.label })}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUseCoupon(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                    !useCoupon
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <TicketIcon className="size-3.5 shrink-0" />
                  <span>{t("couponChoice.usePromotionCode")}</span>
                </button>
                {!useCoupon && (
                  <p className="text-xs text-muted-foreground px-3">
                    {t("couponChoice.promotionCodeHint")}
                  </p>
                )}
              </div>
            )}

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
                onClick={() => {
                  const productName =
                    plan === "pro"
                      ? ProductName.PRO1MONTH
                      : plan === "max"
                        ? ProductName.MAX1MONTH
                        : plan === "super"
                          ? ProductName.SUPER1MONTH
                          : null;
                  if (!productName) {
                    throw new Error("Invalid plan");
                  }
                  upgradeOrCreatePaymentLink({
                    paymentProvider:
                      currency === "CNY" ? PaymentProvider.StripeCNY : PaymentProvider.Stripe,
                    productName,
                  });
                }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    {t("processing")}
                  </>
                ) : isUpgrade ? (
                  t("upgrade")
                ) : (
                  t("subscribe")
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
