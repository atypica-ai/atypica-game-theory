"use client";

import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useDevice } from "@/hooks/use-device";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExpertName } from "../experts/types";
import { createDeepResearchUserChatAction } from "./actions";
import { DeepResearchHistory } from "./DeepResearchHistory";

export function DeepResearchForm() {
  const [query, setQuery] = useState("");
  const [expert, setExpert] = useState<ExpertName>(ExpertName.Auto);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { isMobile } = useDevice();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const result = await createDeepResearchUserChatAction({
        query: query.trim(),
        expert,
      });

      if (!result.success) {
        console.error("Failed to create research session:", result.message);
        return;
      }

      const userChat = result.data;
      router.push(`/deepResearch/${userChat.token}`);
    } catch (error) {
      console.error("Error starting research:", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FitToViewport
      className={cn(
        "flex flex-col items-stretch justify-between gap-6 w-full max-w-5xl mx-auto p-3",
      )}
    >
      <div className="relative w-full">
        <h1 className="sm:text-lg font-medium px-18 text-center">Deep Research Test</h1>
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <DeepResearchHistory />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Query Input */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="query" className="text-sm font-medium">
            Query
          </Label>
          <Textarea
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your research query..."
            className="min-h-32 resize-none focus-visible:border-primary/70 transition-colors p-4"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (!isMobile && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (query.trim()) {
                  const form = e.currentTarget.form;
                  if (form) form.requestSubmit();
                }
              }
            }}
          />
        </div>

        {/* Expert Type Selector */}
        <div className="flex flex-col gap-3">
          <Label className="text-sm font-medium">Expert Type</Label>
          <RadioGroup
            value={expert}
            onValueChange={(value) => setExpert(value as ExpertName)}
            className="flex flex-col gap-2"
            disabled={isLoading}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value={ExpertName.Auto} id="expert-auto" />
              <Label htmlFor="expert-auto" className="font-normal cursor-pointer">
                Auto (Recommended)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value={ExpertName.Grok} id="expert-grok" />
              <Label htmlFor="expert-grok" className="font-normal cursor-pointer">
                Grok
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value={ExpertName.TrendExplorer} id="expert-trend" />
              <Label htmlFor="expert-trend" className="font-normal cursor-pointer">
                Trend Explorer
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="w-full sm:w-auto self-end"
        >
          {isLoading ? "Starting..." : "Start Research"}
        </Button>
      </form>
    </FitToViewport>
  );
}
