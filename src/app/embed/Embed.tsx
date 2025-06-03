"use client";
import { useSession } from "next-auth/react";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function Embed() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  // const router = useRouter();

  useEffect(() => {
    // console.log("pathname:", pathname);
    // console.log("searchParams:", searchParams);
    // console.log("params:", params);
    const href = `${window.location.origin}${pathname}?${searchParams.toString()}`;
    // console.log("href:", href);
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          source: "atypica",
          type: "href",
          href,
          timestamp: new Date().toISOString(),
        },
        "*",
      );
    }
  }, [pathname, searchParams, params]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.target === "atypica" && event.data.type === "check_auth") {
        // 响应父窗口的认证状态检查
        window.parent.postMessage(
          {
            source: "atypica",
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

  return <></>;
}
