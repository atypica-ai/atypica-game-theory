"use client";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { XIcon } from "lucide-react";

interface TagsInputProps {
  value: string; // 逗号分隔的标签字符串
  onChange: (value: string) => void;
}

// AnalystKind, Solution roles, and Podcast RSS 作为可选标签
const ANALYST_KIND_TAGS = [
  "testing",
  "planning",
  "insights",
  "creation",
  "productRnD",
  "fastInsight",
  "misc",
];

const ROLE_TAGS = [
  "creators",
  "influencers",
  "marketers",
  "startupOwners",
  "consultants",
  "productManagers",
];

const PODCAST_TAGS = ["podcastRSS"];

const AVAILABLE_TAGS = [...ANALYST_KIND_TAGS, ...ROLE_TAGS, ...PODCAST_TAGS];

// Get emoji prefix for tag based on its type
function getTagEmoji(tag: string): string {
  if (ANALYST_KIND_TAGS.includes(tag)) return "🎯";
  if (ROLE_TAGS.includes(tag)) return "👤";
  if (PODCAST_TAGS.includes(tag)) return "📻";
  return "";
}

// Format tag with emoji for display
function formatTagDisplay(tag: string): string {
  const emoji = getTagEmoji(tag);
  return emoji ? `${emoji} ${tag}` : tag;
}

export function TagsInput({ value, onChange }: TagsInputProps) {
  // 将逗号分隔的字符串转换为数组
  const tags = value
    ? value
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t)
    : [];

  const addTag = (tag: string) => {
    if (!tag) return;
    if (tags.includes(tag)) return;

    const newTags = [...tags, tag];
    onChange(newTags.join(","));
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((t) => t !== tagToRemove);
    onChange(newTags.join(","));
  };

  // 获取未选择的标签选项
  const availableOptions = AVAILABLE_TAGS.filter((tag) => !tags.includes(tag));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-8">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {formatTagDisplay(tag)}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 rounded-full hover:bg-secondary-foreground/20 p-0.5"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {availableOptions.length > 0 && (
        <Select value="" onValueChange={addTag}>
          <SelectTrigger className="w-full h-8">
            <SelectValue placeholder="Add tag..." />
          </SelectTrigger>
          <SelectContent>
            {availableOptions.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {formatTagDisplay(tag)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
