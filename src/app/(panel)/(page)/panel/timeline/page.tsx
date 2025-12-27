"use client";

import {
  fetchPersonaIdsByTokens,
  startPersonaDiscussionAction,
} from "@/app/(panel)/(page)/actions";
import { SelectPersonaDialog } from "@/components/SelectPersonaDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export default function PanelTestPage() {
  const router = useRouter();
  const [instruction, setInstruction] = useState("");
  const [personaIds, setPersonaIds] = useState<number[]>([]);
  const [personaIdInput, setPersonaIdInput] = useState("");
  const [isPersonaDialogOpen, setIsPersonaDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePersonaIdInput = useCallback((value: string) => {
    setPersonaIdInput(value);
    // Parse comma-separated IDs
    const ids = value
      .split(",")
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id) && id > 0);
    setPersonaIds(ids);
  }, []);

  const handleSelectPersonas = useCallback(async (personaTokens: string[]) => {
    const result = await fetchPersonaIdsByTokens(personaTokens);
    if (result.success) {
      setPersonaIds((prev) => [...prev, ...result.data]);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!instruction.trim() || personaIds.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await startPersonaDiscussionAction({
        instruction: instruction.trim(),
        personaIds,
      });

      if (result.success) {
        router.push(`/panel/timeline/${result.data.timelineToken}`);
      } else {
        alert(`Error: ${result.error}`);
        setIsSubmitting(false);
      }
    } catch (error) {
      alert(`Error: ${(error as Error).message}`);
      setIsSubmitting(false);
    }
  }, [instruction, personaIds, router]);

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Panel Testing</h1>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="instruction">Instruction</Label>
          <Textarea
            id="instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Enter your instruction including both the question/topic to discuss AND the desired discussion type/style (e.g., 'Conduct a debate-style discussion on: Should remote work be mandatory?', or 'Host a roundtable discussion about best practices for team collaboration')"
            rows={6}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            The instruction should include both the question/topic and discussion type/style (e.g.,
            debate, roundtable, focus group, fireside chat).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="personas">Personas</Label>
          <div className="flex gap-2">
            <Input
              id="personas"
              value={personaIdInput}
              onChange={(e) => handlePersonaIdInput(e.target.value)}
              placeholder="Enter comma-separated persona IDs (e.g., 1, 2, 3)"
              className="flex-1"
            />
            <Button variant="outline" onClick={() => setIsPersonaDialogOpen(true)}>
              Search & Select
            </Button>
          </div>
          {personaIds.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Selected {personaIds.length} persona(s): {personaIds.join(", ")}
            </p>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!instruction.trim() || personaIds.length === 0 || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting Panel Discussion...
            </>
          ) : (
            "Start Panel Discussion"
          )}
        </Button>
      </div>

      <SelectPersonaDialog
        open={isPersonaDialogOpen}
        onOpenChange={setIsPersonaDialogOpen}
        onSelect={handleSelectPersonas}
      />
    </div>
  );
}
