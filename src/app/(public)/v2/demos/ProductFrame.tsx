"use client";

import { cn } from "@/lib/utils";
import { L } from "./theme";

/**
 * Light-theme product page container for interactive demos.
 * Mimics the real atypica.AI app: thin sidebar + header (breadcrumb + menu icons) + content.
 */
export default function ProductFrame({
  sidebarActiveIndex = 0,
  sidebarCount = 4,
  accentColor = L.green,
  showSidebar = false,
  breadcrumb,
  children,
  className,
}: {
  sidebarActiveIndex?: number;
  sidebarCount?: number;
  accentColor?: string;
  showSidebar?: boolean;
  breadcrumb: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex overflow-hidden rounded-lg shadow-sm", className)}
      style={{ background: L.bg, border: `1px solid ${L.border}` }}
    >
      {showSidebar && (
        <div
          className="w-10 shrink-0 flex flex-col items-center gap-2.5 pt-3 pb-2 max-sm:hidden"
          style={{ background: L.bgSub, borderRight: `1px solid ${L.border}` }}
        >
          {Array.from({ length: sidebarCount }, (_, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded"
              style={{
                background: i === sidebarActiveIndex ? `${accentColor}15` : "transparent",
                border: `1px solid ${i === sidebarActiveIndex ? `${accentColor}30` : L.border}`,
              }}
            />
          ))}
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header — mimics GlobalHeader */}
        <div
          className="shrink-0 flex items-center gap-3 px-4 py-2.5"
          style={{ borderBottom: `1px solid ${L.borderLight}`, background: L.bgCard }}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0">{breadcrumb}</div>
          {/* Right: help + menu icons (like real GlobalHeader) */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Help icon */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={L.textFaint}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {/* Menu bars icon (matches GlobalHeader MenuBarsIcon) */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={L.textMuted}
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="17" y2="12" />
              <line x1="3" y1="18" x2="13" y2="18" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden relative">{children}</div>
      </div>
    </div>
  );
}

/** Breadcrumb text segment */
export function BreadcrumbSegment({ text, active }: { text: string; active?: boolean }) {
  return (
    <span
      className={cn("text-xs", active ? "font-medium" : "font-IBMPlexMono")}
      style={{ color: active ? L.text : L.textFaint }}
    >
      {text}
    </span>
  );
}

export function BreadcrumbSeparator() {
  return <span style={{ color: L.textFaint }}>/</span>;
}
