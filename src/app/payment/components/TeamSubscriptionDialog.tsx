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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { Team } from "@/prisma/client";
import {
  CalendarIcon,
  CoinsIcon,
  CreditCardIcon,
  InfoIcon,
  LoaderCircle,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PaymentProvider, usePay } from "./usePay";

interface TeamSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  team: Team;
}

export const TeamSubscriptionDialog = ({
  open,
  onOpenChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSuccess,
  team,
}: TeamSubscriptionDialogProps) => {
  const t = useTranslations("Components.TeamSubscriptionDialog");
  const [quantity, setQuantity] = useState<number>(Math.max(3, team.seats));
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>(
    getDeployRegion() === "mainland" ? PaymentProvider.StripeCNY : PaymentProvider.Stripe,
  );
  // 没有支付宝微信扫码支付，用不到 paymentSuccess 和 onSuccess
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [productPrices, setProductPrices] = useState<TProductPrices | null>(null);

  const { createPaymentLink, loading, error } = usePay();

  useEffect(() => {
    fetchProductPricesAction().then(setProductPrices);
  }, []);

  const unitPrice = useMemo(() => {
    if (!productPrices) return "-";
    if (paymentProvider === PaymentProvider.StripeCNY) {
      return `¥${productPrices["TEAMSEAT1MONTH"]["CNY"]}`;
    }
    if (paymentProvider === PaymentProvider.Stripe) {
      return `$${productPrices["TEAMSEAT1MONTH"]["USD"]}`;
    }
    return "-";
  }, [paymentProvider, productPrices]);

  const totalPrice = useMemo(() => {
    if (!productPrices) return "-";
    if (paymentProvider === PaymentProvider.StripeCNY) {
      return `¥${(productPrices["TEAMSEAT1MONTH"]["CNY"] * quantity).toLocaleString()}`;
    }
    if (paymentProvider === PaymentProvider.Stripe) {
      return `$${(productPrices["TEAMSEAT1MONTH"]["USD"] * quantity).toLocaleString()}`;
    }
    return "-";
  }, [paymentProvider, quantity, productPrices]);

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
                <Link href="/team">{t("goToTeam")}</Link>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Team info */}
            <div className="p-4 border rounded-lg mb-4 bg-secondary/30">
              <div className="font-semibold flex items-center gap-2">
                <UsersIcon className="size-4 text-primary" />
                {team.name}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {t("teamSubscriptionFeatures")}
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
                  <CoinsIcon className="size-3" />
                  <span>{t("tokensPerSeat")}</span>
                </div>
              </div>

              {/* Important notice */}
              <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex items-start gap-2">
                  <InfoIcon className="size-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-blue-800">
                    <div className="text-sm font-medium mb-1">{t("notice.title")}</div>
                    <div className="text-xs text-blue-700">{t("notice.description")}</div>
                  </div>
                </div>
              </div>
            </div>

            <Tabs
              value={paymentProvider}
              onValueChange={(value) => setPaymentProvider(value as PaymentProvider)}
            >
              <TabsList className="grid grid-cols-2 mb-4 w-full">
                <TabsTrigger value={PaymentProvider.StripeCNY} disabled={loading}>
                  <div className="size-5 mr-1 rounded-lg overflow-hidden relative">
                    <Image
                      src="/_public/icon-alipay.png"
                      alt="alipay"
                      fill
                      className="object-contain h-5 mr-2"
                    />
                  </div>
                  <span className="max-sm:hidden">{t("alipay")}</span>
                </TabsTrigger>
                <TabsTrigger value={PaymentProvider.Stripe} disabled={loading}>
                  <div className="size-5 mr-1 rounded-lg overflow-hidden relative">
                    <Image
                      src="/_public/icon-stripe.png"
                      alt="stripe"
                      fill
                      className="object-contain h-5 mr-2"
                    />
                  </div>
                  <span className="max-sm:hidden">{t("creditCard")}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value={PaymentProvider.StripeCNY} className="flex justify-center">
                <div className="text-center text-sm text-muted-foreground">
                  {t("redirectToStripe")}
                </div>
              </TabsContent>

              <TabsContent value={PaymentProvider.Stripe} className="flex justify-center">
                <div className="text-center text-sm text-muted-foreground">
                  {t("redirectToStripe")}
                </div>
              </TabsContent>
            </Tabs>

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
                  createPaymentLink({
                    paymentProvider,
                    productName: ProductName.TEAMSEAT1MONTH,
                    quantity: quantity.toString(),
                  });
                }}
                disabled={loading || quantity < 3}
              >
                {loading ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    {t("processing")}
                  </>
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
