"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { AnalystPodcastExtra } from "@/prisma/client";
import {
  ChevronDown,
  ChevronUp,
  ExternalLinkIcon,
  PencilIcon,
  SparklesIcon,
  Star,
  XIcon,
} from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import {
  featurePodcastAction,
  fetchAnalystPodcastsAction,
  generatePodcastMetadataAction,
  updatePodcastTitleAction,
} from "./actions";

type AnalystPodcastWithAnalyst = ExtractServerActionData<typeof fetchAnalystPodcastsAction>[number];

interface PodcastCardProps {
  podcast: AnalystPodcastWithAnalyst;
  onUpdate: (updatedPodcast: AnalystPodcastWithAnalyst) => void;
  onError: (message: string) => void;
}

export function PodcastCard({ podcast, onUpdate, onError }: PodcastCardProps) {
  const locale = useLocale();
  const [expandedTopic, setExpandedTopic] = useState(false);
  const [expandedScript, setExpandedScript] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [generatingMetadata, setGeneratingMetadata] = useState(false);
  const [togglingFeatured, setTogglingFeatured] = useState(false);

  const extra = (podcast.extra || {}) as AnalystPodcastExtra;
  const podcastTitle = extra.metadata?.title || "";
  const kindInfo = extra.kindDetermination;

  const startEditingTitle = () => {
    setIsEditingTitle(true);
    setEditingTitleValue(podcastTitle);
  };

  const cancelEditingTitle = () => {
    setIsEditingTitle(false);
    setEditingTitleValue("");
  };

  const saveTitle = async () => {
    setSavingTitle(true);
    try {
      const result = await updatePodcastTitleAction(podcast.id, editingTitleValue);
      if (result.success) {
        const updatedExtra = {
          ...extra,
          metadata: {
            ...extra.metadata,
            title: editingTitleValue,
          },
        } as AnalystPodcastExtra;

        onUpdate({
          ...podcast,
          extra: updatedExtra,
        });

        setIsEditingTitle(false);
        setEditingTitleValue("");
      } else {
        onError(result.message);
      }
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSavingTitle(false);
    }
  };

  const handleGenerateMetadata = async () => {
    setGeneratingMetadata(true);
    try {
      const result = await generatePodcastMetadataAction(podcast.id);
      if (result.success) {
        const updatedExtra = {
          ...extra,
          metadata: {
            ...extra.metadata,
            title: result.data.title,
            showNotes: result.data.showNotes,
          },
        } as AnalystPodcastExtra;

        onUpdate({
          ...podcast,
          extra: updatedExtra,
        });
      } else {
        onError(result.message);
      }
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setGeneratingMetadata(false);
    }
  };

  const handleToggleFeatured = async () => {
    setTogglingFeatured(true);
    try {
      const result = await featurePodcastAction(podcast.id);
      if (result.success) {
        onUpdate({
          ...podcast,
          isFeatured: !podcast.isFeatured,
        });
      } else {
        onError(result.message);
      }
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setTogglingFeatured(false);
    }
  };

  return (
    <Card className={podcast.isFeatured ? "border-2 border-yellow-400" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between w-full overflow-hidden gap-2">
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editingTitleValue}
                  onChange={(e) => setEditingTitleValue(e.target.value)}
                  className="text-sm"
                  placeholder="Enter title..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      saveTitle();
                    } else if (e.key === "Escape") {
                      cancelEditingTitle();
                    }
                  }}
                />
              </div>
            ) : (
              <div className="leading-normal font-semibold flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-normal">Title:</span>
                <span className={podcastTitle ? "" : "text-muted-foreground italic"}>
                  {podcastTitle || "not set"}
                </span>
              </div>
            )}
          </div>
          {isEditingTitle ? (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={saveTitle}
                disabled={savingTitle}
              >
                ✓
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={cancelEditingTitle}
                disabled={savingTitle}
              >
                <XIcon className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={handleToggleFeatured}
                    disabled={togglingFeatured}
                  >
                    <Star
                      className={`h-4 w-4 ${
                        podcast.isFeatured
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-400 hover:text-yellow-400"
                      } transition-colors`}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  {podcast.isFeatured ? "Remove from featured" : "Add to featured"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={handleGenerateMetadata}
                    disabled={generatingMetadata || !podcast.script}
                  >
                    <SparklesIcon className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  Generate title and show notes with AI
                </TooltipContent>
              </Tooltip>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={startEditingTitle}>
                <PencilIcon className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Topic Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted-foreground">Show notes:</span>
            <button
              onClick={() => setExpandedTopic(!expandedTopic)}
              className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
            >
              {expandedTopic ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Expand
                </>
              )}
            </button>
          </div>
          <p className={`text-sm ${expandedTopic ? "whitespace-pre-wrap" : "line-clamp-2"}`}>
            {extra.metadata?.showNotes || ""}
          </p>
        </div>

        {/* Script Section */}
        {podcast.script && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Script:</span>
              <button
                onClick={() => setExpandedScript(!expandedScript)}
                className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
              >
                {expandedScript ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Expand
                  </>
                )}
              </button>
            </div>
            <p className={`text-sm ${expandedScript ? "whitespace-pre-wrap" : "line-clamp-3"}`}>
              {podcast.script}
            </p>
          </div>
        )}

        {/* Kind Determination */}
        {kindInfo && (
          <div className="mb-4">
            <span className="text-xs font-medium text-muted-foreground">Kind: </span>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-sm font-semibold">{kindInfo.kind}</span>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-md text-xs p-3">
                  {kindInfo.reason}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Meta Information */}
        <div className="space-y-1 text-sm text-muted-foreground border-t pt-3">
          <p>
            <span className="text-xs">User:</span> {podcast.analyst.user?.email || "N/A"}
          </p>
          <p>
            <span className="text-xs">Token:</span>{" "}
            <span className="font-mono">{podcast.token}</span>
          </p>
          <p>
            <span className="text-xs">Generated:</span>{" "}
            {podcast.generatedAt ? formatDate(podcast.generatedAt, locale) : "Not generated"}
          </p>
          <p>
            <span className="text-xs">Created:</span> {formatDate(podcast.createdAt, locale)}
          </p>
        </div>
      </CardContent>
      <CardFooter className="gap-2 items-center justify-between flex-wrap mt-auto">
        <div className="flex items-center">
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              podcast.analyst.kind === "testing"
                ? "bg-blue-100 text-blue-800"
                : podcast.analyst.kind === "planning"
                  ? "bg-green-100 text-green-800"
                  : podcast.analyst.kind === "insights"
                    ? "bg-purple-100 text-purple-800"
                    : podcast.analyst.kind === "creation"
                      ? "bg-orange-100 text-orange-800"
                      : podcast.analyst.kind === "misc"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-gray-100 text-gray-500"
            }`}
          >
            {podcast.analyst.kind || "N/A"}
          </span>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link
            href={`/artifacts/podcast/${podcast.token}/share`}
            target="_blank"
            className="flex items-center gap-1"
          >
            <ExternalLinkIcon className="h-3 w-3" />
            Listen
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
