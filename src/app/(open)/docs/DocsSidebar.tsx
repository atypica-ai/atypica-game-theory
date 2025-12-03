"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

type DocSection = {
  title: string;
  href: string;
  items: {
    label: string;
    href: string;
    primary?: boolean;
  }[];
};

const docSections: DocSection[] = [
  {
    title: "API Reference",
    href: "/docs/api",
    items: [
      { label: "Authentication", href: "#authentication", primary: true },
      { label: "Base URL", href: "#base-url", primary: true },
      { label: "List Members", href: "#list-members", primary: true },
      { label: "Create User", href: "#create-user", primary: true },
      { label: "Invite User", href: "#invite-user", primary: true },
      { label: "Impersonation", href: "#impersonation", primary: true },
      { label: "Error Responses", href: "#errors" },
      { label: "Rate Limits", href: "#rate-limits" },
    ],
  },
  {
    title: "Embed Integration",
    href: "/docs/embed",
    items: [
      { label: "Quick Start", href: "#quick-start", primary: true },
      { label: "Message Protocol", href: "#message-protocol", primary: true },
      { label: "Authentication", href: "#authentication", primary: true },
      { label: "Actions", href: "#actions", primary: true },
      { label: "Complete Example", href: "#complete-example", primary: true },
      { label: "Security", href: "#security" },
      { label: "Troubleshooting", href: "#troubleshooting" },
    ],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();
  const currentSection = docSections.find((section) => pathname === section.href);

  return (
    <aside className="hidden md:block w-64 shrink-0">
      <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
        {/* Header in sidebar */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">atypica.AI Docs</h1>
          <p className="text-sm text-muted-foreground">Developer Documentation</p>
        </div>

        {/* Top-level navigation */}
        <nav className="mb-8">
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
            Documentation
          </h2>
          <ul className="space-y-2 text-sm">
            {docSections.map((section) => (
              <li key={section.href}>
                <Link
                  href={section.href}
                  className={cn(
                    "block py-1 hover:text-primary transition-colors",
                    pathname === section.href ? "text-primary font-semibold" : "text-foreground",
                  )}
                >
                  {section.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Current section navigation */}
        {currentSection && (
          <nav>
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
              On This Page
            </h2>
            <ul className="space-y-2 text-sm">
              {currentSection.items.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className={cn(
                      "block py-1 hover:underline transition-colors",
                      item.primary ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </aside>
  );
}

export function MobileDocsNav() {
  const pathname = usePathname();
  const currentSection = docSections.find((section) => pathname === section.href);

  return (
    <div className="md:hidden">
      {/* Mobile Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">atypica.AI Docs</h1>
        <p className="text-sm text-muted-foreground">Developer Documentation</p>
      </div>

      {/* Mobile Top-level Navigation */}
      <nav className="mb-6 pb-4 border-b border-border">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
          Documentation
        </h2>
        <ul className="grid grid-cols-2 gap-2 text-sm">
          {docSections.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className={cn(
                  "block py-1 hover:text-primary transition-colors",
                  pathname === section.href ? "text-primary font-semibold" : "text-foreground",
                )}
              >
                {section.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile Section Navigation */}
      {currentSection && (
        <nav className="mb-8 pb-6 border-b border-border">
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
            On This Page
          </h2>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {currentSection.items.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className={cn(
                    "block py-1 hover:underline transition-colors",
                    item.primary ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
