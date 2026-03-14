import { Button } from "@/components/ui/button";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn } from "@/lib/utils";
import { PlayIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { fetchFeaturedPodcasts } from "./actions";

type FeaturedPodcastItem = ExtractServerActionData<typeof fetchFeaturedPodcasts>[number];

export function HighlightPodcast({ podcast }: { podcast: FeaturedPodcastItem }) {
  const t = useTranslations("FeaturedPodcastsPage");
  return (
    <section className="py-10 md:py-28 px-4">
      <div className="mx-auto max-w-6xl bg-card border border-border rounded-2xl p-8 sm:p-8 md:p-12 relative overflow-hidden shadow-lg">
        {/* Share Button - Top Right */}
        {/*<Button
          variant="outline"
          size="sm"
          className="absolute top-6 right-6 h-7 text-xs rounded-full shadow-none"
        >
          <ShareIcon className="size-3" />
          <span className="max-sm:hidden">Share</span>
        </Button>*/}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <div className="flex-1">
            <h1 className="font-EuclidCircularA font-medium text-2xl md:text-3xl tracking-tight mb-4 line-clamp-2 sm:line-clamp-1">
              {podcast.title}
            </h1>
            <h2 className="text-muted-foreground line-clamp-4 sm:mb-6">{podcast.description}</h2>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {/*<CalendarDaysIcon className="w-4 h-4" />
              <span>{formatDate(podcast.generatedAt, locale)}</span>*/}
              {/*<MessageSquareIcon className="w-4 h-4" />
              <span>{placeholderReplies} replies</span>
              <span>{placeholderDuration}</span>*/}
            </div>
          </div>

          {/* Play Button */}
          <Button
            variant="default"
            className={cn("sm:h-20 sm:w-20 md:h-24 md:w-24 sm:rounded-full", "shadow-lg shrink-0")}
            asChild
          >
            <Link href={podcast.url} target="_blank">
              <PlayIcon className="size-4 sm:size-8 md:size-10" />
              <span className="sm:hidden">{t("playPodcast")}</span>
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
