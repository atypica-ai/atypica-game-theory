"use client";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function GlobalFooter({ className }: { className?: string }) {
  const t = useTranslations("Components.GlobalFooter");
  return (
    <footer
      className={cn(
        "shrink-0 mt-auto px-4 py-12 pt-20 bg-background/80 backdrop-blur-sm",
        className,
      )}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <div className="font-EuclidCircularA font-bold text-lg leading-none">atypica.AI</div>
            <p className="text-sm text-muted-foreground max-w-md">{t("tagline")}</p>
            <p className="text-xs text-muted-foreground">
              {t("copyright", { year: new Date().getFullYear() })}
            </p>
          </div>

          {/* Product Column */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">{t("product")}</h4>
            <div className="space-y-3 text-sm">
              <Link
                href="/pricing"
                className="block text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("pricing")}
              </Link>
              <Link
                href="/persona-simulation"
                className="block text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("personaSimulation")}
              </Link>
              <Link
                href="/changelog"
                className="block text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("changelog")}
              </Link>
            </div>
          </div>

          {/* Company Column */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">{t("company")}</h4>
            <div className="space-y-3 text-sm">
              <Link
                href="/about"
                className="block text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("about")}
              </Link>
              {/* <Link
                href="/status"
                className="block text-muted-foreground hover:text-foreground transition-colors"
              >
                Status
              </Link> */}
              <Link
                href="/terms"
                className="block text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("terms")}
              </Link>
              <Link
                href="/privacy"
                className="block text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("privacy")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
