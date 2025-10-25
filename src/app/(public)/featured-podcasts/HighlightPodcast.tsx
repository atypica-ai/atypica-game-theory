import { Button } from "@/components/ui/button";
import { ExtractServerActionData } from "@/lib/serverAction";
import { CalendarDaysIcon, MessageSquareIcon, PlayIcon, ShareIcon } from "lucide-react";
import Link from "next/link";
import { fetchFeaturedPodcasts } from "./actions";

type FeaturedPodcastItem = ExtractServerActionData<typeof fetchFeaturedPodcasts>[number];

type FeaturedPodcastProps = {
  podcast: FeaturedPodcastItem["podcast"] | null;
  analyst: FeaturedPodcastItem["analyst"] | null;
  studyUserChat: FeaturedPodcastItem["studyUserChat"] | null;
  locale: string;
  placeholderDuration: string;
  placeholderReplies: number;
};

export function HighlightPodcast({
  podcast,
  analyst,
  studyUserChat,
  locale,
  placeholderDuration,
  placeholderReplies,
}: FeaturedPodcastProps) {
  const formatDate = (date: Date, locale: string) => {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const hasPodcast = podcast && analyst;

  return (
    <section className="container mx-auto px-4 py-20 md:py-28">
      <div className="max-w-6xl mx-auto">
        <div className="bg-card border border-border rounded-2xl p-8 md:p-12 relative overflow-hidden shadow-lg">
          {/* Share Button - Top Right */}
          <Button
            variant="outline"
            size="sm"
            className="absolute top-6 right-6 h-7 text-xs rounded-full shadow-none"
          >
            <ShareIcon className="size-3" />
            <span className="max-sm:hidden">Share</span>
          </Button>

          {hasPodcast ? (
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="flex-1">
                <h1 className="font-EuclidCircularA font-medium text-4xl md:text-5xl lg:text-6xl tracking-tight text-foreground mb-4 line-clamp-1">
                  {studyUserChat?.title || "Untitled Study"}
                </h1>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-handwriting text-primary mb-6 line-clamp-3">
                  {analyst.topic}
                </h2>

                {/* Metadata */}
                <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
                  <CalendarDaysIcon className="w-4 h-4" />
                  <span>{formatDate(podcast.generatedAt || podcast.createdAt, locale)}</span>
                  <MessageSquareIcon className="w-4 h-4" />
                  <span>{placeholderReplies} replies</span>
                  <span>{placeholderDuration}</span>
                </div>

                {studyUserChat && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    asChild
                  >
                    <Link href={`/study/${studyUserChat.token}/share`}>View Study</Link>
                  </Button>
                )}
              </div>

              {/* Play Button */}
              <Button
                size="icon"
                className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-foreground hover:bg-foreground/90 text-background shadow-lg flex-shrink-0"
                asChild
              >
                <Link href={`/artifacts/podcast/${podcast.token}/share`} target="_blank">
                  <PlayIcon className="size-8 md:size-10 ml-1" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No featured podcasts available yet.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
