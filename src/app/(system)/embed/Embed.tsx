"use client";
import {
  createStudyUserChatAction,
  fetchAnalystReportsOfStudyUserChat,
} from "@/app/(study)/study/actions";
import { useSession } from "next-auth/react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function Embed() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    // console.log("pathname:", pathname);
    // console.log("searchParams:", searchParams);
    // console.log("params:", params);
    const search = searchParams.toString();
    const href = `${window.location.origin}${pathname}${search ? `?${search}` : ""}`;
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
      if (event.data.target !== "atypica") {
        return;
      }
      if (event.data.type === "check_auth") {
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
      if (event.data.type === "action") {
        if (
          event.data.action === "fetchAnalystReportsOfStudyUserChat" &&
          /^\/study/.test(pathname) &&
          typeof params.token === "string"
        ) {
          fetchAnalystReportsOfStudyUserChat({
            studyUserChatToken: params.token,
            includeOnePageHtml: true,
          })
            .then((result) => {
              if (!result.success) throw result;
              console.log(result.data);
              window.parent.postMessage(
                {
                  source: "atypica",
                  type: "action_result",
                  action: "fetchAnalystReportsOfStudyUserChat",
                  result: result.data,
                  timestamp: new Date().toISOString(),
                },
                "*",
              );
            })
            .catch((error) => console.error(error));
        }
        if (event.data.action === "createStudyUserChat") {
          createStudyUserChatAction({
            role: "user",
            content: event.data.args.content,
          })
            .then((result) => {
              if (!result.success) throw result;
              router.push(`/study/${result.data.token}`);
              window.parent.postMessage(
                {
                  source: "atypica",
                  type: "action_result",
                  action: "createStudyUserChat",
                  result: result.data,
                  timestamp: new Date().toISOString(),
                },
                "*",
              );
            })
            .catch((error) => console.error(error));
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [status, session, params, pathname, router]);

  return <></>;
}
