import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { ExtractServerActionData } from "@/lib/serverAction";
import { truncateForTitle } from "@/lib/textUtils";
import { useCallback, useEffect, useState } from "react";
import type { fetchAnalysts } from "./actions";

type AnalystWithFeature = ExtractServerActionData<typeof fetchAnalysts>[number];

type PodcastKind = "auto" | "deepDive" | "opinionOriented";

interface PodcastPromptDialogProps {
  open: boolean;
  analyst: AnalystWithFeature | null;
  defaultPrompt: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (params: { podcastKind: PodcastKind; systemPrompt?: string }) => void;
}

export function PodcastPromptDialog({
  open,
  analyst,
  defaultPrompt,
  onOpenChange,
  onConfirm,
}: PodcastPromptDialogProps) {
  const [podcastKind, setPodcastKind] = useState<PodcastKind>("auto");
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [currentDefaultPrompt, setCurrentDefaultPrompt] = useState("");

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPodcastKind("auto");
      setShowPromptEditor(false);
      setSystemPrompt("");
      if (defaultPrompt) {
        setCurrentDefaultPrompt(defaultPrompt);
      }
    }
  }, [open, defaultPrompt]);

  const handleLoadPrompt = useCallback(() => {
    setShowPromptEditor(true);
    setSystemPrompt(currentDefaultPrompt);
  }, [currentDefaultPrompt]);

  const handleReset = useCallback(() => {
    setShowPromptEditor(false);
    setSystemPrompt("");
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Generate Podcast</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {/* Podcast Kind Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Podcast Type</Label>
            <RadioGroup value={podcastKind} onValueChange={(v) => setPodcastKind(v as PodcastKind)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id="auto" />
                <Label htmlFor="auto" className="font-normal cursor-pointer">
                  Auto-detect (Recommended) - AI will choose the best format
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="deepDive" id="deepDive" />
                <Label htmlFor="deepDive" className="font-normal cursor-pointer">
                  Deep Dive - Two hosts exploring the research in depth
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="opinionOriented" id="opinionOriented" />
                <Label htmlFor="opinionOriented" className="font-normal cursor-pointer">
                  Opinion Oriented - Solo host with strong viewpoint
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* System Prompt Editor (only for manual kind selection) */}
          {podcastKind !== "auto" && (
            <div className="space-y-3">
              {!showPromptEditor ? (
                <Button variant="outline" size="sm" onClick={handleLoadPrompt}>
                  Customize System Prompt (Optional)
                </Button>
              ) : (
                <>
                  <div>
                    <Label
                      htmlFor="podcast-system-prompt"
                      className="text-sm font-medium mb-2 block"
                    >
                      System Prompt
                    </Label>
                    <Textarea
                      id="podcast-system-prompt"
                      placeholder="Enter custom system prompt for podcast script generation..."
                      className="min-h-[200px] max-h-[400px]"
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      The system prompt will guide the AI in generating the podcast script.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Reset to Default
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Analyst Info */}
          {analyst && (
            <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
              <strong>Topic:</strong>{" "}
              {truncateForTitle(analyst.topic, {
                maxDisplayWidth: 80,
                suffix: "...",
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {analyst && (
            <ConfirmDialog
              title="Generate Podcast"
              description={`Are you sure you want to generate a podcast for "${truncateForTitle(
                analyst.topic,
                {
                  maxDisplayWidth: 50,
                  suffix: "...",
                },
              )}"? This will use AI tokens.`}
              onConfirm={() => {
                onConfirm({
                  podcastKind,
                  systemPrompt: showPromptEditor && systemPrompt ? systemPrompt : undefined,
                });
                onOpenChange(false);
              }}
            >
              <Button variant="default">Generate Podcast</Button>
            </ConfirmDialog>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
