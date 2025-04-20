import { PaymentMethod, ProductName } from "@/app/payment/data";
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
import { cn } from "@/lib/utils";
import { CalendarIcon, CoinsIcon, CreditCardIcon, LoaderCircle, StarIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { retrieveLatestPaid } from "../actions";
import { usePay } from "./usePay";

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const SubscriptionDialog = ({ open, onOpenChange, onSuccess }: SubscriptionDialogProps) => {
  const locale = useLocale();
  const t = useTranslations("Components.SubscriptionDialog");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.wx_pub);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);

  const {
    createPaymentLink,
    clearPaymentLink,
    paymentScanQR,
    loading: paymentLoading,
    error: paymentError,
  } = usePay();

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

  return (
    <>
      <Script
        src="https://global.heidiancdn.com/javascripts/vendor/pingpp-2.2.11.js"
        strategy="lazyOnload"
        onError={() => setError("Failed to load payment SDK")}
      />

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
                <Button type="button" disabled={paymentLoading} asChild>
                  <Link href="/account">{t("goToAccount")}</Link>
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="p-4 border rounded-lg mb-4 bg-secondary/30">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <StarIcon className="size-4 text-primary" />
                      {t("proSubscription")}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarIcon className="size-3" />
                      <span>{t("monthlySubscription")}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                      <CoinsIcon className="size-3" />
                      <span className={cn(locale === "en-US" && "tracking-tight")}>
                        {t("proMonthlyTokens")}
                      </span>
                    </div>
                  </div>
                  <div className="text-xl font-bold">
                    {paymentMethod === PaymentMethod.stripe ? "$20" : "¥129"}
                    <span className="text-sm font-normal">/{t("month")}</span>
                  </div>
                </div>
              </div>

              <Tabs
                defaultValue={PaymentMethod.wx_pub}
                onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              >
                <TabsList className="grid grid-cols-3 mb-4">
                  {[
                    [PaymentMethod.alipay_wap, "/_public/icon-alipay.png", t("alipay")],
                    [PaymentMethod.wx_pub, "/_public/icon-wechat.png", t("wechatPay")],
                    [PaymentMethod.stripe, "/_public/icon-stripe.png", t("creditCard")],
                  ].map(([method, icon, title]) => (
                    <TabsTrigger
                      key={method}
                      value={method}
                      disabled={paymentLoading || method === PaymentMethod.stripe}
                      onClick={() => {
                        // 切换 tab 需要清空带支付的二维码
                        clearPaymentLink();
                      }}
                    >
                      <div className="size-5 mr-1 rounded-lg overflow-hidden relative">
                        <Image src={icon} alt={method} fill className="object-contain h-5 mr-2" />
                      </div>
                      {title}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value={PaymentMethod.alipay_wap} className="flex justify-center">
                  {paymentScanQR && !paymentLoading ? (
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
                </TabsContent>

                <TabsContent value={PaymentMethod.wx_pub} className="flex justify-center">
                  {paymentScanQR && !paymentLoading ? (
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
                </TabsContent>

                <TabsContent value={PaymentMethod.stripe} className="flex justify-center">
                  <div className="text-center text-sm text-muted-foreground">
                    {t("redirectToStripe")}
                  </div>
                </TabsContent>
              </Tabs>

              {(error || paymentError) && (
                <div className="text-red-500 text-sm text-center mb-4">{error || paymentError}</div>
              )}

              <DialogFooter>
                <Link
                  href="/pricing"
                  className="text-sm text-primary hover:underline flex items-center gap-2 mr-auto"
                >
                  <CreditCardIcon className="size-5" />
                  {t("viewPricing")}
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={paymentLoading}
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    createPaymentLink({
                      paymentMethod,
                      productName: ProductName.PRO1MONTH,
                    })
                  }
                  disabled={paymentLoading}
                  className={cn(
                    paymentScanQR && paymentMethod !== PaymentMethod.stripe ? "hidden" : "",
                  )}
                >
                  {paymentLoading ? (
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
    </>
  );
};
