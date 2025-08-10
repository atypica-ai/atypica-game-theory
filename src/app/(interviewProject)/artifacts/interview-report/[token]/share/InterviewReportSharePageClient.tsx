"use client";
import GlobalHeader from "@/components/layout/GlobalHeader";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/UserMenu";
import UserTokensBalance from "@/components/UserTokensBalance";
import { Loader2Icon, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function InterviewReportSharePageClient({ reportToken }: { reportToken: string }) {
  const t = useTranslations("InterviewProject.reportShare");
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  const reportUrl = useMemo(() => {
    return `/artifacts/interview-report/${reportToken}/raw`;
  }, [reportToken]);

  const copyShareLink = useCallback(() => {
    const url = window.location.origin + pathname;
    navigator.clipboard.writeText(url).then(() => {
      toast.success(t("copyLinkToClipboard"));
    });
  }, [pathname, t]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // 3s 以后强制取消 loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="h-dvh flex flex-col items-stretch justify-start bg-muted/20">
      <GlobalHeader className="h-12">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={copyShareLink}>
            <Share2 size={14} />
            <span className="hidden sm:inline">{t("copyLink")}</span>
          </Button>
          <UserTokensBalance />
          <UserMenu />
        </div>
      </GlobalHeader>

      <div className="flex-1 w-full relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
              <Loader2Icon className="size-8 animate-spin" />
              <div className="text-sm text-muted-foreground">{t("title")}</div>
            </div>
          </div>
        )}

        <iframe
          src={reportUrl}
          className="flex-1 w-full h-full border-none"
          onLoad={handleIframeLoad}
        />
      </div>

      <footer className="py-2 px-4 text-center text-xs text-muted-foreground border-t border-border">
        <span>{t("poweredBy")}</span>
      </footer>
    </div>
  );
}
