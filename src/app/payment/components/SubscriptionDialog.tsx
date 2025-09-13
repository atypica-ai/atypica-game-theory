import { upgradeFromProToMaxAction } from "@/app/payment/(stripe)/actions";
import {
  fetchProductPricesAction,
  retrieveLatestPaid,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { cn } from "@/lib/utils";
import { SubscriptionPlan, UserSubscription } from "@/prisma/client";
import {
  CalendarIcon,
  CoinsIcon,
  CreditCardIcon,
  GiftIcon,
  InfoIcon,
  LoaderCircle,
  StarIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PaymentProvider, usePay } from "./usePay";

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  activeSubscription?: UserSubscription | null;
}

export const SubscriptionDialog = ({
  plan,
  open,
  onOpenChange,
  onSuccess,
  activeSubscription,
}: SubscriptionDialogProps & { plan?: SubscriptionPlan }) => {
  if (open && !plan) {
    throw new Error("SubscriptionDialog requires a plan");
  }
  const t = useTranslations("Components.SubscriptionDialog");
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>(
    getDeployRegion() === "mainland" ? PaymentProvider.StripeCNY : PaymentProvider.Stripe,
  );
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [productPrices, setProductPrices] = useState<TProductPrices | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const {
    createPaymentLink,
    clearPaymentLink,
    paymentScanQR,
    loading: usePayLoading,
    error: usePayError,
  } = usePay();

  useEffect(() => {
    setError(usePayError);
  }, [usePayError]);

  useEffect(() => {
    setLoading(usePayLoading);
  }, [usePayLoading]);

  // Poll for payment success
  useEffect(() => {
    if (!open || !paymentScanQR || paymentSuccess) return;
    let timeoutId: NodeJS.Timeout;
    const pollInterval = 2000; // 2 seconds
    let pollCount = 0;
    const maxPolls = 300; // Stop polling after 10 minutes (300 * 2 seconds)
    const poll = async () => {
      try {
        const latestPaymentRecord = await retrieveLatestPaid(paymentScanQR.createdAt);
        if (latestPaymentRecord) {
          setPaymentSuccess(true);
          if (onSuccess) onSuccess();
          return;
        }
      } catch (err) {
        console.error("Error polling for payment status:", err);
      }
      pollCount++;
      if (pollCount < maxPolls) {
        timeoutId = setTimeout(poll, pollInterval);
      }
    };
    // Start polling
    timeoutId = setTimeout(poll, pollInterval);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [open, paymentScanQR, paymentSuccess, onSuccess]);

  useEffect(() => {
    fetchProductPricesAction().then(setProductPrices);
  }, []);

  const price = useMemo(() => {
    if (!productPrices) return "-";
    if (paymentProvider === PaymentProvider.Pingxx && plan === SubscriptionPlan.pro) {
      return `¥${productPrices["PRO1MONTH"]["CNY"]}`;
    }
    if (paymentProvider === PaymentProvider.Pingxx && plan === SubscriptionPlan.max) {
      return `¥${productPrices["MAX1MONTH"]["CNY"]}`;
    }
    if (paymentProvider === PaymentProvider.StripeCNY && plan === SubscriptionPlan.pro) {
      return `¥${productPrices["PRO1MONTH"]["CNY"]}`;
    }
    if (paymentProvider === PaymentProvider.StripeCNY && plan === SubscriptionPlan.max) {
      return `¥${productPrices["MAX1MONTH"]["CNY"]}`;
    }
    if (paymentProvider === PaymentProvider.Stripe && plan === SubscriptionPlan.pro) {
      return `$${productPrices["PRO1MONTH"]["USD"]}`;
    }
    if (paymentProvider === PaymentProvider.Stripe && plan === SubscriptionPlan.max) {
      return `$${productPrices["MAX1MONTH"]["USD"]}`;
    }
    return "-";
  }, [paymentProvider, plan, productPrices]);

  const isUpgradeFromPro = useMemo(() => {
    return activeSubscription?.plan === SubscriptionPlan.pro && plan === SubscriptionPlan.max;
  }, [activeSubscription, plan]);

  const upgradeOrCreatePaymentLink = useCallback(
    async ({
      paymentProvider,
      productName,
    }: {
      paymentProvider: PaymentProvider;
      productName: ProductName.MAX1MONTH | ProductName.PRO1MONTH;
    }) => {
      if (isUpgradeFromPro) {
        setLoading(true);
        try {
          const result = await upgradeFromProToMaxAction();
          if (!result.success) throw result;
          setPaymentSuccess(true);
        } catch (error) {
          console.log("Error upgrading from Pro to Max:", error);
          setError((error as Error).message);
        } finally {
          setLoading(false);
        }
      } else {
        createPaymentLink({ paymentProvider, productName });
      }
    },
    [createPaymentLink, isUpgradeFromPro],
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
            {plan === "pro" ? t("proTitle") : plan === "max" ? t("maxTitle") : "-"}
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
            {isUpgradeFromPro && (
              <div className="p-3 border rounded-lg mb-1 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-2">
                  <InfoIcon className="size-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-blue-800">
                    <div className="text-sm font-medium mb-1">{t("upgradeNotice.title")}</div>
                    <div className="text-xs text-blue-700">{t("upgradeNotice.description")}</div>
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
                          : "-"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <GiftIcon className="size-3" />
                    <span className="flex-1">
                      {plan === "pro" ? t("proGift") : plan === "max" ? t("maxGift") : "-"}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-xl font-bold">{price}</span>
                  <span className="text-sm font-normal">/{t("month")}</span>
                </div>
              </div>
            </div>

            <Tabs
              value={paymentProvider}
              onValueChange={(value) => setPaymentProvider(value as PaymentProvider)}
            >
              <TabsList className="grid grid-cols-2 mb-4 w-full">
                {/* <TabsTrigger
                  value={PaymentProvider.Pingxx}
                  disabled={loading}
                  onClick={() => clearPaymentLink()} // 切换 tab 需要清空带支付的二维码
                >
                  <div className="size-5 mr-1 rounded-lg overflow-hidden relative">
                    <Image
                      src="/_public/icon-alipay.png"
                      alt="alipay"
                      fill
                      className="object-contain h-5 mr-2"
                    />
                  </div>
                  <span className="max-sm:hidden">{t("alipay")}</span>
                  <div className="ml-2 size-5 mr-1 rounded-lg overflow-hidden relative">
                    <Image
                      src="/_public/icon-wechat.png"
                      alt="wechat pay"
                      fill
                      className="object-contain h-5 mr-2"
                    />
                  </div>
                  <span className="max-sm:hidden">{t("wechatPay")}</span>
                </TabsTrigger> */}
                <TabsTrigger
                  value={PaymentProvider.StripeCNY}
                  disabled={loading}
                  onClick={() => clearPaymentLink()} // 切换 tab 需要清空带支付的二维码
                >
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
                <TabsTrigger
                  value={PaymentProvider.Stripe}
                  disabled={loading}
                  onClick={() => clearPaymentLink()} // 切换 tab 需要清空带支付的二维码
                >
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

              {/* <TabsContent value={PaymentProvider.Pingxx} className="flex justify-center">
                {paymentScanQR && !loading ? (
                  <div className="flex flex-col items-center">
                    <div className="text-sm mb-2 text-center">{t("scanQrCode")}</div>
                    <div className="p-2 bg-white rounded-lg">
                      <QRCodeSVG
                        value={paymentScanQR.url}
                        size={200}
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                        level="H"
                        marginSize={0}
                      />
                    </div>
                  </div>
                ) : null}
              </TabsContent> */}

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
                  const productName =
                    plan === "pro"
                      ? ProductName.PRO1MONTH
                      : plan === "max"
                        ? ProductName.MAX1MONTH
                        : null;
                  if (!productName) {
                    throw new Error("Invalid plan");
                  }
                  upgradeOrCreatePaymentLink({ paymentProvider, productName });
                }}
                disabled={loading}
                className={cn(
                  paymentScanQR && paymentProvider === PaymentProvider.Pingxx ? "hidden" : "",
                )}
              >
                {loading ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    {t("processing")}
                  </>
                ) : isUpgradeFromPro ? (
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
