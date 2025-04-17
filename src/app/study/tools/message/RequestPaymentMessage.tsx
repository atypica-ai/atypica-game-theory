import { getProductsForPayment } from "@/app/payment/actions";
import { ProductName } from "@/app/payment/constants";
import { useStudyContext } from "@/app/study/hooks/StudyContext";
import { checkStudyUserChatConsume } from "@/data/UserPoints";
import { ExtractServerActionData } from "@/lib/serverAction";
import { RequestPaymentResult } from "@/tools/user/payment";
import { ToolInvocation } from "ai";
import { MessageCircleQuestionIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Script from "next/script";
import { QRCodeSVG } from "qrcode.react";
import { FC, useCallback, useEffect, useState } from "react";

type ProductForPayment = ExtractServerActionData<typeof getProductsForPayment>[number];

export const RequestPaymentMessage: FC<{
  toolInvocation: ToolInvocation;
  addToolResult?: ({
    toolCallId,
    result,
  }: {
    toolCallId: string;
    result: RequestPaymentResult;
  }) => void;
}> = ({
  toolInvocation,
  // addToolResult
}) => {
  const t = useTranslations("StudyPage.RequestPaymentMessage");
  const { data: session } = useSession();
  const {
    studyUserChat: { id: studyUserChatId },
  } = useStudyContext();
  const [paymentSuccess, setPaymentSuccess] = useState(false); // toolInvocation.state === "result"

  useEffect(() => {
    if (toolInvocation.state === "result") {
      return;
    }
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      timeoutId = setTimeout(poll, 1000);
      const result = await checkStudyUserChatConsume({ studyUserChatId });
      if (!result.success) {
        throw new Error(result.message);
      }
      if (result.data) {
        clearTimeout(timeoutId);
        // 一旦检测到成功了，就可以停下，刷新页面后再次请求 chat 接口会进入 study 流程
        // 没必要再 addToolResult，而且这里有个问题，会不知道什么原因 addToolResult 提交到了刷新页面以后的 study chat 里，这里可能是延迟提交的
        // addToolResult({
        //   toolCallId: toolInvocation.toolCallId,
        //   result: {plainText: "支付成功，额度充足，请继续调研"},
        // });
        setPaymentSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    };
    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [toolInvocation.state, toolInvocation.toolCallId, studyUserChatId]);

  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      setIsMobile(mobileRegex.test(userAgent));
    };
    checkMobile();
  }, []);

  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const createPingxxPaymentUrl = useCallback(
    async ({ productName, userId }: { productName: ProductName; userId: number }) => {
      const url = new URL(`${window.location.origin}/payment/new`);
      const params = new URLSearchParams();
      params.append("userId", userId.toString());
      // params.append("paymentMethod", paymentMethod);
      params.append("productName", productName);
      if (isMobile) {
        params.append("successUrl", encodeURIComponent(window.location.href));
      } else {
        // 因为是弹出二维码在手机上扫码支付，手机上显示固定的支付成功地址
        params.append(
          "successUrl",
          encodeURIComponent(`${window.location.origin}/payment/success`),
        );
      }
      url.search = params.toString();
      if (isMobile) {
        window.location.href = url.toString();
      } else {
        setPaymentUrl(url.toString());
      }
    },
    [isMobile],
  );

  const submitForStripePayment = useCallback(
    ({ productName, userId }: { productName: ProductName; userId: number }) => {
      const form = document.createElement("form");
      form.action = "/payment/stripe";
      form.method = "POST";
      const formData = [
        { name: "userId", value: userId.toString() },
        { name: "productName", value: productName },
        { name: "successUrl", value: window.location.href },
      ];
      for (const item of formData) {
        const input = document.createElement("input");
        input.name = item.name;
        input.value = item.value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    },
    [],
  );

  const handlePayment = async (item: ProductForPayment) => {
    if (!session?.user) {
      return;
    }
    if (item.currency === "CNY") {
      await createPingxxPaymentUrl({
        productName: item.name,
        userId: session.user.id,
      });
    } else if (item.currency === "USD") {
      submitForStripePayment({
        productName: item.name,
        userId: session.user.id,
      });
    }
  };

  const [products, setProducts] = useState<ProductForPayment[]>([]);
  useEffect(() => {
    getProductsForPayment().then((result) => {
      if (result.success) {
        setProducts(result.data);
      }
    });
  }, []);

  return !paymentSuccess ? (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg">
      <div className="text-sm text-foreground/80 mb-3 flex items-center justify-start gap-1">
        <strong>{t("outOfQuotaHint")}</strong>
        <MessageCircleQuestionIcon className="size-4" />
      </div>
      <div className="flex flex-col gap-2">
        {products.map((item, index) => (
          <div
            key={index}
            className="p-2 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
            onClick={() => handlePayment(item)}
          >
            <div className="text-xs flex items-center justify-between">
              <span>{item.desc}</span>
              <span className="ml-auto">
                {item.currency === "CNY" ? "¥" : item.currency === "USD" ? "$" : item.currency}
              </span>
              <span>{item.price}</span>
            </div>
          </div>
        ))}
      </div>
      <Script
        src="https://global.heidiancdn.com/javascripts/vendor/pingpp-2.2.11.js"
        strategy="lazyOnload"
        // onError={() => setError("Failed to load Ping++ SDK")}
      />
      {/* <div>{paymentUrl}</div> */}
      {paymentUrl && (
        <div className="qrcode-container">
          <div className="my-4 text-xs">
            <span>{t("scanQrCode")}</span>
          </div>
          <QRCodeSVG
            value={paymentUrl}
            size={180}
            bgColor="#FFFFFF"
            fgColor="#000000"
            level="H"
            marginSize={0}
          />
        </div>
      )}
    </div>
  ) : (
    <div className="text-sm">{t("paymentSuccess")}</div>
  );
};
