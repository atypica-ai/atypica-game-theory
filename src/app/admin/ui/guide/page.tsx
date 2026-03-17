"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRightIcon, CheckIcon, PlusIcon, XIcon } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground/60">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function AdminUIGuidePage() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-base font-semibold">Design Guide</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Patterns and conventions used across the product.
        </p>
      </div>

      {/* ── Color Tokens ── */}
      <Section title="Color Tokens">
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {[
            { name: "primary", cls: "bg-primary text-primary-foreground" },
            { name: "foreground", cls: "bg-foreground text-background" },
            { name: "secondary", cls: "bg-secondary text-secondary-foreground" },
            { name: "accent", cls: "bg-accent text-accent-foreground" },
            { name: "muted", cls: "bg-muted text-muted-foreground" },
            { name: "destructive", cls: "bg-destructive text-white" },
            { name: "ghost-green", cls: "bg-ghost-green text-black" },
            { name: "background", cls: "bg-background text-foreground border" },
            { name: "card", cls: "bg-card text-card-foreground border" },
            { name: "border", cls: "bg-border" },
            { name: "input", cls: "bg-input" },
            { name: "popover", cls: "bg-popover text-popover-foreground border" },
          ].map((token) => (
            <div key={token.name} className="flex flex-col items-center gap-1.5">
              <div className={cn("size-10 rounded-md", token.cls)} />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{token.name}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Primary = green (both modes). Default button uses foreground/background (black/white).
        </p>
      </Section>

      {/* ── Radius ── */}
      <Section title="Radius (--radius: 0.5rem)">
        <div className="flex items-end gap-4">
          {[
            { name: "sm", val: "4px", cls: "rounded-sm" },
            { name: "md", val: "6px", cls: "rounded-md" },
            { name: "lg", val: "8px", cls: "rounded-lg" },
            { name: "xl", val: "12px", cls: "rounded-xl" },
            { name: "full", val: "", cls: "rounded-full" },
          ].map((r) => (
            <div key={r.name} className="flex flex-col items-center gap-1">
              <div className={cn("size-12 border-2 border-foreground/20 bg-muted", r.cls)} />
              <span className="text-[10px] text-muted-foreground">{r.name}</span>
              {r.val && <span className="text-[10px] text-muted-foreground/50">{r.val}</span>}
            </div>
          ))}
        </div>
      </Section>

      {/* ── Button Usage ── */}
      <Section title="Button Usage">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-36 shrink-0">CTA / high emphasis</span>
            <Button variant="primary" size="sm">Get Started</Button>
            <span className="text-[10px] text-muted-foreground">variant=&quot;primary&quot;</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-36 shrink-0">Standard action</span>
            <Button size="sm">Search</Button>
            <span className="text-[10px] text-muted-foreground">default (no variant)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-36 shrink-0">Dialog footer</span>
            <Button variant="outline" size="sm">Cancel</Button>
            <Button size="sm">Confirm</Button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-36 shrink-0">Icon action</span>
            <Button variant="ghost" size="icon"><PlusIcon /></Button>
          </div>
        </div>
      </Section>

      {/* ── Text Emphasis ── */}
      <Section title="Text Emphasis (not text-primary)">
        <div className="p-4 border border-border rounded-lg space-y-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Do NOT use text-primary for emphasis. Green text on white is hard to read.
              Instead, keep text in foreground colors and add green as decoration.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <XIcon className="size-3 text-destructive shrink-0 mt-1" />
              <div>
                <span className="text-xs text-muted-foreground">Wrong: </span>
                <span className="text-sm text-primary">Important text in green</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckIcon className="size-3 text-primary shrink-0 mt-1" />
              <div>
                <span className="text-xs text-muted-foreground">Bold: </span>
                <span className="text-sm font-semibold">Important text, just bold</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckIcon className="size-3 text-primary shrink-0 mt-1" />
              <div>
                <span className="text-xs text-muted-foreground">Underline accent: </span>
                <span className="text-sm font-semibold border-b-2 border-primary pb-0.5">Highlighted with green underline</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckIcon className="size-3 text-primary shrink-0 mt-1" />
              <div>
                <span className="text-xs text-muted-foreground">Dot prefix: </span>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                  <span className="size-1.5 rounded-full bg-primary shrink-0" />
                  Status label with green dot
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckIcon className="size-3 text-primary shrink-0 mt-1" />
              <div>
                <span className="text-xs text-muted-foreground">Left border: </span>
                <span className="text-sm border-l-2 border-primary pl-2">Accented with green left border</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckIcon className="size-3 text-primary shrink-0 mt-1" />
              <div>
                <span className="text-xs text-muted-foreground">Badge: </span>
                <Badge variant="outline" className="gap-1.5">
                  <span className="size-1.5 rounded-full bg-ghost-green" />
                  Status
                </Badge>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground/60 pt-2 border-t border-border/50">
            Green as icon color (CheckIcon, decorative dots) is fine.
            Green as text color is not — use foreground + decoration instead.
          </p>
        </div>
      </Section>

      {/* ── Card Patterns ── */}
      <Section title="Card Patterns (Product)">
        <p className="text-xs text-muted-foreground">
          Product pages use hand-rolled divs, not the Card component.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <div className="group border border-border rounded-lg hover:border-foreground/20 transition-all duration-300 p-4 flex flex-col gap-2">
            <div className="text-sm font-semibold">Standard Card</div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              rounded-lg, p-4, no shadow, hover darkens border.
            </p>
            <div className="flex items-center pt-3 mt-auto border-t border-border/50 text-xs text-muted-foreground gap-3">
              <span>Footer</span>
              <ArrowRightIcon className="size-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all ml-auto" />
            </div>
          </div>

          <div className="group border border-dashed border-border rounded-lg p-5 hover:border-foreground/20 transition-all duration-300 flex flex-col items-center justify-center gap-3">
            <div className="size-10 rounded-full bg-muted group-hover:bg-accent transition-colors flex items-center justify-center">
              <PlusIcon className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div className="text-sm font-medium">Create New</div>
            <div className="text-xs text-muted-foreground">Dashed + centered</div>
          </div>

          <div className="group border border-border rounded-lg p-3 hover:border-foreground/20 transition-all">
            <div className="flex items-start gap-2">
              <div className="size-3.5 rounded-sm bg-muted-foreground/20 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium line-clamp-2">Sidebar Card</div>
                <div className="text-xs text-muted-foreground mt-1">Compact, p-3</div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Typography ── */}
      <Section title="Typography">
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="w-32 shrink-0">Page title</span>
            <span className="text-base font-semibold text-foreground">text-base font-semibold</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-32 shrink-0">Card title</span>
            <span className="text-sm font-semibold text-foreground">text-sm font-semibold</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-32 shrink-0">Body (max)</span>
            <span className="text-sm text-foreground">text-sm</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-32 shrink-0">Secondary</span>
            <span className="text-xs text-muted-foreground">text-xs text-muted-foreground</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-32 shrink-0">Section label</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">tracking label</span>
          </div>
        </div>
      </Section>

      {/* ── Changes ── */}
      <Section title="Recent Changes">
        <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
          {[
            "Button: new 'primary' variant (green). Default is now black/white (neutral).",
            "Primary color = green in both light and dark mode",
            "--radius: 0.625rem \u2192 0.5rem",
            "shadow-xs removed from all form controls and buttons",
            "Card: rounded-lg, gap-4, py-4, px-4, no shadow",
            "Tooltip: bg-foreground (decoupled from primary)",
            "Text emphasis: use foreground + green decoration, NOT green text",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckIcon className="size-3 text-primary shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
