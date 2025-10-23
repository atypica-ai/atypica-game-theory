import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ExtractServerActionData } from "@/lib/serverAction";
import { truncateForTitle } from "@/lib/textUtils";
import { useCallback, useEffect, useState } from "react";
import type { fetchAnalysts } from "./actions";

type AnalystWithFeature = ExtractServerActionData<typeof fetchAnalysts>[number];

interface PodcastPromptDialogProps {
  open: boolean;
  analyst: AnalystWithFeature | null;
  defaultPrompt: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (systemPrompt?: string) => void;
}

export function PodcastPromptDialog({
  open,
  analyst,
  defaultPrompt,
  onOpenChange,
  onConfirm,
}: PodcastPromptDialogProps) {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [currentDefaultPrompt, setCurrentDefaultPrompt] = useState("");

  // Initialize default prompt when dialog opens
  useEffect(() => {
    if (open && defaultPrompt) {
      setCurrentDefaultPrompt(defaultPrompt);
      setSystemPrompt(defaultPrompt); // Set to default prompt initially
    }
  }, [open, defaultPrompt]);

  const handleReset = useCallback(() => {
    setSystemPrompt(currentDefaultPrompt);
  }, [currentDefaultPrompt]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Customize Podcast System Prompt</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="podcast-system-prompt" className="text-sm font-medium mb-2 block">
              System Prompt (Optional)
            </Label>
            <Textarea
              id="podcast-system-prompt"
              placeholder="Enter custom system prompt for podcast script generation..."
              className="min-h-[200px] max-h-[400px]"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              The system prompt will guide the AI in generating the podcast script. Modify the
              template below or leave it as-is to use the default settings.
            </p>
          </div>
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
        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="flex gap-2">
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
                  onConfirm(systemPrompt);
                  onOpenChange(false);
                }}
              >
                <Button variant="default">Generate Podcast</Button>
              </ConfirmDialog>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
