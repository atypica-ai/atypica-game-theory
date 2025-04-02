import { createCharge } from "@/app/payment/actions";
import { ProductName } from "@/app/payment/ProductName";
import { checkStudyUserChatConsume } from "@/data/UserPoints";
import { RequestPaymentResult } from "@/tools/user/payment";
import { ToolInvocation } from "ai";
import { MessageCircleQuestionIcon } from "lucide-react";
import Script from "next/script";
import { FC, useCallback, useEffect } from "react";
import { useStudyContext } from "../../hooks/StudyContext";

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

  // const [isLoading, setIsLoading] = useState(false);
  // const [error, setError] = useState("");

  // Initiate payment
  const handlePayment = async (productName: ProductName) => {
    // setIsLoading(true);
    // setError("");
    try {
      const { charge } = await createCharge("alipay_pc_direct", productName, window.location.href);
      if (window.pingpp) {
        window.pingpp.createPayment(charge, function (result) {
          if (result.status === "success") {
          } else if (result.status === "fail") {
            // setError(result.error?.msg || "Payment failed");
          } else if (result.status === "cancel") {
            // setError("Payment was cancelled");
          }
          // setIsLoading(false);
        });
      } else {
        // setError("Ping++ SDK not loaded");
        // setIsLoading(false);
      }
    } catch (err) {
      console.error("Payment error:", err);
      // setError((err as Error).message);
      // setIsLoading(false);
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
    </div>
  ) : (
    <div className="text-sm">🎉 支付成功，您可以继续和 atypica.LLM 对话开始调研！</div>
  );
};
