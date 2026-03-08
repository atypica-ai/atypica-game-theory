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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackEvent } from "@/lib/analytics/segment";
import { SubscriptionPlan, Team } from "@/prisma/client";
import {
  CalendarIcon,
  CoinsIcon,
  CreditCardIcon,
  Infinity,
  InfoIcon,
  LoaderCircle,
  TagIcon,
  TicketIcon,
  UsersIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PaymentProvider, usePay } from "./usePay";

interface TeamSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  team: Pick<Team, "id" | "name" | "seats">;
}

export const TeamSubscriptionDialog = ({
  plan,
  open,
  onOpenChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSuccess,
  team,
}: TeamSubscriptionDialogProps & { plan: SubscriptionPlan | null }) => {
  if (open && !plan) {
    throw new Error("TeamSubscriptionDialog requires a plan");
  }
  const t = useTranslations("Components.TeamSubscriptionDialog");
  const locale = useLocale();
  const [quantity, setQuantity] = useState<number>(Math.max(3, team.seats));
  const [productPrices, setProductPrices] = useState<TProductPrices | null>(null);

  const { createPaymentLink, loading, error } = usePay();
  const [couponInfo, setCouponInfo] = useState<{ couponId: string; label: string } | null>(null);
  const [useCoupon, setUseCoupon] = useState(true);

  useEffect(() => {
    fetchProductPricesAction().then(setProductPrices);
    getAvailableCouponInfoAction().then(setCouponInfo);
  }, []);

  const currency = locale === "zh-CN" ? "CNY" : "USD";

  const productName = useMemo(() => {
    switch (plan) {
      case SubscriptionPlan.team:
        return ProductName.TEAMSEAT1MONTH;
      case SubscriptionPlan.superteam:
        return ProductName.SUPERTEAMSEAT1MONTH;
      default:
        return ProductName.TEAMSEAT1MONTH;
    }
  }, [plan]);

  useEffect(() => {
    if (!open) return;
    trackEvent("Product Viewed", { name: productName, currency });
  }, [open, productName, currency]);

  const isUnlimited = plan === SubscriptionPlan.superteam;

  const unitPrice = useMemo(() => {
    if (!productPrices) return "-";
    const sign = currency === "CNY" ? "¥" : "$";
    return `${sign}${productPrices[productName][currency]}`;
  }, [currency, productPrices, productName]);

  const totalPrice = useMemo(() => {
    if (!productPrices) return "-";
    const sign = currency === "CNY" ? "¥" : "$";
    return `${sign}${(productPrices[productName][currency] * quantity).toLocaleString()}`;
  }, [currency, quantity, productPrices, productName]);

  // const submitForStripePayment = useCallback(
  //   ({ teamId, quantity, currency }: { teamId: number; quantity: number; currency: string }) => {
  //     try {
  //       setLoading(true);
  //       setError(null);
  //       setPaymentStartedAt(new Date());

  //       const form = document.createElement("form");
  //       form.action = "/payment/stripe-team";
  //       form.method = "POST";

  //       const formData = [
  //         { name: "teamId", value: teamId.toString() },
  //         { name: "quantity", value: quantity.toString() },
  //         { name: "currency", value: currency },
  //         { name: "successUrl", value: window.location.href },
  //       ];

  //       for (const item of formData) {
  //         const input = document.createElement("input");
  //         input.name = item.name;
  //         input.value = item.value;
  //         form.appendChild(input);
  //       }

  //       document.body.appendChild(form);
  //       form.submit();
  //       document.body.removeChild(form);
  //     } catch (err) {
  //       setError("Failed to initialize Stripe payment");
  //       console.error(err);
  //       setLoading(false);
  //     }
  //   },
  //   [],
  // );

  // const handleSubscribe = useCallback(() => {
  //   const currency = paymentProvider === TeamPaymentProvider.Stripe ? "USD" : "CNY";
  //   submitForStripePayment({
  //     teamId: team.id,
  //     quantity,
  //     currency,
  //   });
  // }, [paymentProvider, team.id, quantity, submitForStripePayment]);

  const handleQuantityChange = useCallback((value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num >= 3) {
      setQuantity(num);
    }
  }, []);

  // // Show upgrade/renewal notice for existing subscriptions
  // const isUpgrade = existingSubscription && quantity > existingSubscription.seats;
  // const isRenewal = existingSubscription && quantity === existingSubscription.seats;

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

        {/* Team info */}
        <div className="p-4 border rounded-lg mb-4 bg-secondary/30">
          <div className="font-semibold flex items-center gap-2">
            <UsersIcon className="size-4 text-primary" />
            {team.name}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {isUnlimited ? t("superteamSubscriptionFeatures") : t("teamSubscriptionFeatures")}
          </div>
        </div>

        {/* Seat selection */}
        <div className="space-y-4 mb-4">
          <div className="space-y-2">
            <Label htmlFor="seats">{t("seatsLabel")}</Label>
            <Input
              id="seats"
              type="number"
              min="3"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              disabled={loading}
            />
            <div className="text-xs text-muted-foreground">{t("minimumSeats")}</div>
          </div>

          {/* Pricing display */}
          <div className="p-4 border rounded-lg bg-secondary/30">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm">
                {unitPrice} × {quantity} {t("seats")}
              </div>
              <div className="font-semibold">{totalPrice}</div>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarIcon className="size-3" />
              <span>{t("monthlyBilling")}</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {isUnlimited ? (
                <>
                  <Infinity className="size-3 text-primary" />
                  <span className="font-semibold text-primary">{t("unlimitedTokens")}</span>
                </>
              ) : (
                <>
                  <CoinsIcon className="size-3" />
                  <span>{t("tokensPerSeat")}</span>
                </>
              )}
            </div>
          </div>

          {/* Important notice */}
          <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
            <div className="flex items-start gap-2">
              <InfoIcon className="size-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-blue-800">
                <div className="text-sm font-medium mb-1">{t("notice.title")}</div>
                <div className="text-xs text-blue-700">{t("notice.description")}</div>
              </div>
            </div>
          </div>
        </div>

        {couponInfo && (
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
          <Link href="/pricing#organization" className="text-sm flex items-center gap-2 mr-auto">
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
              createPaymentLink({
                paymentProvider:
                  currency === "CNY" ? PaymentProvider.StripeCNY : PaymentProvider.Stripe,
                productName: productName,
                quantity,
                couponId: useCoupon && couponInfo ? couponInfo.couponId : undefined,
              });
            }}
            disabled={loading || quantity < 3}
          >
            {loading ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {t("processing")}
              </>
            ) : (
              t("subscribe")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
