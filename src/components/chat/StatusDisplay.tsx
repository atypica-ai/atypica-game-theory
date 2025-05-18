"use client";
import { useTranslations } from "next-intl";

export function StatusDisplay({ status }: { status: string }) {
  const t = useTranslations("ScoutPage.status");

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "streaming":
        return t("thinking");
      case "submitted":
        return t("processing");
      case "complete":
        return t("complete");
      case "error":
        return t("error");
      case "ready":
        return t("ready");
      default:
        return status;
    }
  };

  if (!status) return null;

  return (
    <div className="flex gap-2 justify-center items-center text-xs">
      <span>{getStatusMessage(status)}</span>
      {(status === "streaming" || status === "submitted") && (
        <div className="flex gap-1 h-4">
          <span className="animate-bounce">·</span>
          <span className="animate-bounce [animation-delay:0.2s]">·</span>
          <span className="animate-bounce [animation-delay:0.4s]">·</span>
        </div>
      )}
    </div>
  );
}
