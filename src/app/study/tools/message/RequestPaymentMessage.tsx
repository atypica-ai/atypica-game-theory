import { PaymentMethod, ProductName } from "@/app/payment/constants";
import { useStudyContext } from "@/app/study/hooks/StudyContext";
import { checkStudyUserChatConsume } from "@/data/UserPoints";
import { RequestPaymentResult } from "@/tools/user/payment";
import { ToolInvocation } from "ai";
import { MessageCircleQuestionIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import Script from "next/script";
import { QRCodeSVG } from "qrcode.react";
import { FC, useCallback, useEffect, useState } from "react";

export const RequestPaymentMessage: FC<{
  toolInvocation: ToolInvocation;
  addToolResult: ({
    toolCallId,
    result,
  }: {
    toolCallId: string;
    result: RequestPaymentResult;
  }) => void;
}> = ({ toolInvocation, addToolResult }) => {
  const { data: session } = useSession();
  const { studyUserChatId, pendingUserToolInvocation, setPendingUserToolInvocation } =
    useStudyContext();

  useEffect(() => {
    if (
      pendingUserToolInvocation?.toolCallId == toolInvocation.toolCallId &&
      toolInvocation.state === "result"
    ) {
      setPendingUserToolInvocation(null);
    }
    if (!pendingUserToolInvocation && toolInvocation.state !== "result") {
      setPendingUserToolInvocation(toolInvocation);
    }
  }, [pendingUserToolInvocation, setPendingUserToolInvocation, toolInvocation]);

  const checkAndHandleConsume = useCallback(async () => {
    if (toolInvocation.state !== "result") {
      const result = await checkStudyUserChatConsume({ studyUserChatId });
      if (result) {
        addToolResult({
          toolCallId: toolInvocation.toolCallId,
          result: {
            plainText: "支付成功，额度充足，请继续调研",
          },
        });
      }
    }
  }, [toolInvocation.state, toolInvocation.toolCallId, studyUserChatId, addToolResult]);

  useEffect(() => {
    if (toolInvocation.state === "result") {
      return;
    }
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      timeoutId = setTimeout(poll, 1000);
      await checkAndHandleConsume();
    };
    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [toolInvocation.state, checkAndHandleConsume]);

  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const createPaymentUrl = useCallback(
    async ({
      paymentMethod,
      productName,
      userId,
    }: {
      paymentMethod: PaymentMethod;
      productName: ProductName;
      userId: number;
    }) => {
      const url = new URL(`${window.location.origin}/payment/new`);
      const params = new URLSearchParams();
      params.append("userId", userId.toString());
      params.append("paymentMethod", paymentMethod);
      params.append("productName", productName);
      params.append("successUrl", encodeURIComponent(window.location.href));
      url.search = params.toString();
      setPaymentUrl(url.toString());
    },
    [],
  );

  // const [isLoading, setIsLoading] = useState(false);
  // const [error, setError] = useState("");
  // Initiate payment
  const handlePayment = async (productName: ProductName) => {
    if (!session?.user) {
      return;
    }
    if (productName === ProductName.POINTS100_A) {
      await createPaymentUrl({
        paymentMethod: PaymentMethod.wx_pub,
        productName,
        userId: session.user.id,
      });
    } else if (productName === ProductName.POINTS100_B) {
      await createPaymentUrl({
        paymentMethod: PaymentMethod.alipay_wap,
        productName,
        userId: session.user.id,
      });
    }
  };

  const products = [
    { name: ProductName.POINTS100_A, desc: "挂耳咖啡", price: 7.5 },
    { name: ProductName.POINTS100_B, desc: "Manner咖啡", price: 15 },
    { name: ProductName.POINTS100_C, desc: "星巴克咖啡", price: 30 },
    { name: ProductName.POINTS100_D, desc: "小蓝瓶咖啡", price: 45 },
  ];

  return toolInvocation.state !== "result" ? (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg">
      <div className="text-sm text-foreground/80 mb-3 flex items-center justify-start gap-1">
        <strong>免费研究额度已经用完，不如请一杯咖啡再做一份研究？</strong>
        <MessageCircleQuestionIcon className="size-4" />
      </div>
      <div className="flex flex-col gap-2">
        {products.map((item, index) => (
          <div
            key={index}
            className="p-2 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
            onClick={() => handlePayment(item.name)}
          >
            <div className="text-xs flex items-center justify-between max-w-27">
              <span>{item.desc}</span>
              <span>{item.price}元</span>
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
          <QRCodeSVG
            value={paymentUrl}
            size={256}
            bgColor="#FFFFFF"
            fgColor="#000000"
            level="H"
            marginSize={10}
          />
        </div>
      )}
    </div>
  ) : (
    <div className="text-sm">🎉 支付成功，您可以继续和 atypica.LLM 对话开始研究！</div>
  );
};
