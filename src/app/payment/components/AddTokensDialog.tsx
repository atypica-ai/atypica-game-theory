import {
  PaymentMethod,
  PingxxNewPaymentParams,
  ProductName,
  StripeNewPaymentParams,
} from "@/app/payment/data";
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
import { Currency } from "@prisma/client";
import { CoinsIcon, GiftIcon, LoaderCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Script from "next/script";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";
import { retrieveLatestPaid } from "../actions";

interface AddTokensDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddTokensDialog = ({ open, onOpenChange, onSuccess }: AddTokensDialogProps) => {
  const t = useTranslations("Components.AddTokensDialog");
  const { data: session } = useSession();
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.wx_pub);
  const [paymentScanQR, setPaymentScanQR] = useState<{ url: string; createdAt: Date } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      setIsMobile(mobileRegex.test(userAgent));
    };
    checkMobile();
  }, []);

  // Pingxx payment
  const createPingxxPaymentUrl = useCallback(
    async ({
      productName,
      currency,
      userId,
      method,
    }: {
      productName: ProductName;
      currency: Currency;
      userId: number;
      method: PaymentMethod;
    }) => {
      try {
        setLoading(true);
        setError(null);
        setPaymentScanQR(null);
        const url = new URL(`${window.location.origin}/payment/new`);
        const params: PingxxNewPaymentParams = {
          userId: userId,
          paymentMethod: method,
          productName: productName,
          currency: currency,
          successUrl: isMobile
            ? encodeURIComponent(`${window.location.origin}/payment/success`) // 因为是弹出二维码在手机上扫码支付，手机上显示固定的支付成功地址
            : encodeURIComponent(window.location.href),
        };
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          searchParams.append(key, value.toString());
        });
        url.search = searchParams.toString();
        if (isMobile) {
          window.location.href = url.toString();
        } else {
          setPaymentScanQR({ url: url.toString(), createdAt: new Date() });
        }
      } catch (err) {
        setError("Failed to create payment URL");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [isMobile],
  );

  // Stripe payment
  const submitForStripePayment = useCallback(
    ({
      productName,
      currency,
      userId,
    }: {
      productName: ProductName;
      currency: Currency;
      userId: number;
    }) => {
      try {
        setLoading(true);
        const params: StripeNewPaymentParams = {
          userId: userId,
          productName,
          currency,
          successUrl: window.location.href,
        };
        const form = document.createElement("form");
        form.action = "/payment/stripe";
        form.method = "POST";
        const formData = Object.entries(params).map(([key, value]) => ({
          name: key,
          value: value.toString(),
        }));
        for (const item of formData) {
          const input = document.createElement("input");
          input.name = item.name;
          input.value = item.value;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
      } catch (err) {
        setError("Failed to initialize Stripe payment");
        console.error(err);
        setLoading(false);
      }
    },
    [],
  );

  // Handle payment initiation
  const handlePayment = async () => {
    if (!session?.user) {
      setError("You must be logged in to make a purchase");
      return;
    }
    if (paymentMethod === PaymentMethod.stripe) {
      submitForStripePayment({
        productName: ProductName.TOKENS1M,
        currency: Currency.USD,
        userId: session.user.id,
      });
    } else {
      await createPingxxPaymentUrl({
        productName: ProductName.TOKENS1M,
        currency: Currency.CNY,
        userId: session.user.id,
        method: paymentMethod,
      });
    }
  };

  // Poll for payment success
  useEffect(() => {
    if (!open || !paymentScanQR || paymentSuccess) return;
    let timeoutId: NodeJS.Timeout;
    const pollInterval = 2000; // 2 seconds
    let pollCount = 0;
    const maxPolls = 60; // Stop polling after 2 minutes (60 * 2 seconds)
    const poll = async () => {
      try {
        const latestPaymentRecord = await retrieveLatestPaid(paymentScanQR.createdAt);
        if (latestPaymentRecord) {
          setPaymentSuccess(true);
          if (onSuccess) onSuccess();
          setTimeout(() => {
            onOpenChange(false);
            window.location.reload();
          }, 2000);
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
  }, [open, paymentScanQR, paymentSuccess, onSuccess, onOpenChange]);

  return (
    <>
      <Script
        src="https://global.heidiancdn.com/javascripts/vendor/pingpp-2.2.11.js"
        strategy="lazyOnload"
        onError={() => setError("Failed to load payment SDK")}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          {paymentSuccess ? (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="text-green-500 font-semibold text-xl mb-2">{t("paymentSuccess")}</div>
              <div className="text-sm text-muted-foreground">{t("refreshing")}</div>
            </div>
          ) : (
            <>
              <div className="p-4 border rounded-lg mb-4 bg-secondary/30">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{t("tokenPackage")}</div>
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                      <CoinsIcon className="size-3" />
                      <span>{t("oneMillionTokens")}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                      <GiftIcon className="size-3" />
                      <span>{t("oneMillionTokensBonus")}</span>
                    </div>
                  </div>
                  <div className="text-xl font-bold">
                    {paymentMethod === PaymentMethod.stripe ? "$16" : "¥100"}
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
                      disabled={loading || method === PaymentMethod.stripe}
                    >
                      <div className="size-5 mr-1 rounded-lg overflow-hidden relative">
                        <Image src={icon} alt={method} fill className="object-contain h-5 mr-2" />
                      </div>
                      {title}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value={PaymentMethod.alipay_wap} className="flex justify-center">
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
                </TabsContent>

                <TabsContent value={PaymentMethod.wx_pub} className="flex justify-center">
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
                </TabsContent>

                <TabsContent value={PaymentMethod.stripe} className="flex justify-center">
                  <div className="text-center text-sm text-muted-foreground">
                    {t("redirectToStripe")}
                  </div>
                </TabsContent>
              </Tabs>

              {error && <div className="text-red-500 text-sm text-center mb-4">{error}</div>}

              <DialogFooter>
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
                  onClick={handlePayment}
                  disabled={loading}
                  className={cn(
                    paymentScanQR && paymentMethod !== PaymentMethod.stripe ? "hidden" : "",
                  )}
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
