"use client";
import { Loader2Icon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EmbedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // 如果在 iframe 中且已认证，重定向到主页面
    if (status === "authenticated" && window.parent !== window) {
      // 通知父窗口认证成功
      window.parent.postMessage(
        {
          type: "auth_success",
          user: session?.user,
          timestamp: new Date().toISOString(),
        },
        "*",
      );

      // 重定向到主页面
      router.replace("/");
    } else if (status === "unauthenticated") {
      // 如果未认证，重定向到登录页面
      router.replace("/auth/signin");
    }
  }, [status, session, router]);

  // 监听来自父窗口的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "check_auth") {
        // 响应父窗口的认证状态检查
        window.parent.postMessage(
          {
            type: "auth_status",
            authenticated: status === "authenticated",
            user: session?.user,
            timestamp: new Date().toISOString(),
          },
          "*",
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [status, session]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2Icon className="size-8 animate-spin mx-auto mb-4" />
          <p>检查认证状态...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">嵌入式应用</h1>
        {status === "authenticated" ? (
          <div>
            <p className="text-green-600 mb-2">✓ 已登录</p>
            <p>用户: {session?.user?.email}</p>
          </div>
        ) : (
          <p className="text-red-600">正在重定向到登录页面...</p>
        )}
      </div>
    </div>
  );
}
