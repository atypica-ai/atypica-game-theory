"use client";
import { Button } from "@/components/ui/button";
import Cookies from "js-cookie";
import { GlobeIcon } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

export default function LanguageToggle() {
  const router = useRouter();
  const locale = useLocale();

  const toggleLocale = () => {
    const newLocale = locale === "zh-CN" ? "en-US" : "zh-CN";
    // Save to cookie
    Cookies.set("locale", newLocale, { expires: 365 });
    // Refresh the page to apply changes
    router.refresh();
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggleLocale} title="Change Language">
      <GlobeIcon className="h-4 w-4 mr-1" />
      <span className="text-xs">{locale === "zh-CN" ? "中文" : "English"}</span>
    </Button>
  );
}
