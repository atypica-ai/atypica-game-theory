import {
  BarChart3Icon,
  BookOpenIcon,
  BrainIcon,
  BuildingIcon,
  ClipboardIcon,
  CodeIcon,
  CreditCardIcon,
  GemIcon,
  HeadphonesIcon,
  ImageIcon,
  KeyIcon,
  LightbulbIcon,
  type LucideIcon,
  MapIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  MicIcon,
  MicroscopeIcon,
  PaletteIcon,
  PaperclipIcon,
  PlayIcon,
  RocketIcon,
  SearchIcon,
  Share2Icon,
  ShieldIcon,
  SparklesIcon,
  SproutIcon,
  StarIcon,
  UsersIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react";
import React from "react";
import { ChangelogSection } from "./changelog-data-en";

const iconMap: Record<string, LucideIcon> = {
  star: StarIcon,
  search: SearchIcon,
  paperclip: PaperclipIcon,
  brain: BrainIcon,
  users: UsersIcon,
  "bar-chart-3": BarChart3Icon,
  palette: PaletteIcon,
  code: CodeIcon,
  building: BuildingIcon,
  "message-square": MessageSquareIcon,
  rocket: RocketIcon,
  gem: GemIcon,
  shield: ShieldIcon,
  "share-2": Share2Icon,
  "book-open": BookOpenIcon,
  lightbulb: LightbulbIcon,
  sparkles: SparklesIcon,
  wrench: WrenchIcon,
  "credit-card": CreditCardIcon,
  map: MapIcon,
  clipboard: ClipboardIcon,
  play: PlayIcon,
  zap: ZapIcon,
  microscope: MicroscopeIcon,
  key: KeyIcon,
  headphones: HeadphonesIcon,
  mic: MicIcon,
  megaphone: MegaphoneIcon,
  image: ImageIcon,
  sprout: SproutIcon,
};

function ItemIcon({ name }: { name?: string }) {
  const Icon = name ? iconMap[name] : null;
  if (!Icon) return null;
  return <Icon className="size-3.5 shrink-0 text-muted-foreground" />;
}

export function Changelog({
  data,
  footer,
  title,
  subtitle,
}: {
  data: ChangelogSection[];
  footer: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
      {/* Page header */}
      <header className="mb-16 md:mb-20">
        <div className="w-10 h-1 bg-ghost-green mb-6" />
        <h1 className="text-3xl md:text-4xl font-EuclidCircularA font-medium tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </header>

      {/* Sections */}
      <div className="space-y-16">
        {data.map((section, sectionIndex) => (
          <section key={sectionIndex}>
            {/* Section title */}
            <h2 className="text-base font-semibold font-EuclidCircularA mb-8">
              {section.title}
            </h2>

            {/* Versions */}
            <div className="space-y-12">
              {section.versions.map((version, versionIndex) => (
                <article key={versionIndex}>
                  {/* Version + date */}
                  <div className="flex items-baseline gap-3 mb-6">
                    <span className="font-IBMPlexMono text-xs tracking-wide text-foreground">
                      {version.version}
                    </span>
                    <span className="font-IBMPlexMono text-xs tracking-wide text-muted-foreground">
                      {version.date}
                    </span>
                  </div>

                  {/* Timeline items */}
                  <div className="relative ml-[5px] border-l border-border pl-6 space-y-5">
                    {version.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="relative">
                        {/* Green dot on timeline */}
                        <div className="absolute -left-[calc(1.5rem+3.5px)] top-[7px] size-[7px] rounded-full bg-ghost-green" />

                        {/* Content */}
                        <div>
                          <div className="flex items-center gap-2">
                            <ItemIcon name={item.icon} />
                            <h4
                              className="text-sm font-semibold leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: item.title }}
                            />
                          </div>
                          {item.description && (
                            <p
                              className="mt-1 text-sm text-muted-foreground leading-relaxed"
                              dangerouslySetInnerHTML={{
                                __html: item.description,
                              }}
                            />
                          )}
                          {item.subitems && (
                            <ul className="mt-1 space-y-1">
                              {item.subitems.map((subitem, subitemIndex) => (
                                <li
                                  key={subitemIndex}
                                  className="text-sm text-muted-foreground leading-relaxed flex gap-2"
                                >
                                  <span className="text-border mt-1.5 shrink-0">
                                    &#8226;
                                  </span>
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: subitem,
                                    }}
                                  />
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        {/* Footer */}
        <footer className="pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground font-IBMPlexMono tracking-wide">
            {footer}
          </p>
        </footer>
      </div>
    </div>
  );
}
