"use client";

import { fetchPersonasByTokens } from "@/app/(panel)/tools/requestSelectPersonas/actions";
import { SelectPersonaDialog } from "@/components/SelectPersonaDialog";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PersonaPanelWithDetails, updatePanelPersonas } from "./actions";
import { PersonaCard } from "./PersonaCard";
import { PersonaDetailDialog } from "./PersonaDetailDialog";

type PersonaData = PersonaPanelWithDetails["personas"][number];

interface PanelPersonaListProps {
  panelId: number;
  personaIds: number[];
  personas: PersonaData[];
}

export function PanelPersonaList({ panelId, personaIds, personas }: PanelPersonaListProps) {
  const t = useTranslations("PersonaPanel");
  const router = useRouter();
  const [selectedPersona, setSelectedPersona] = useState<PersonaData | null>(null);
  const [showAddPersona, setShowAddPersona] = useState(false);

  const handleAddPersonas = async (tokens: string[]) => {
    if (tokens.length === 0) return;
    const result = await fetchPersonasByTokens(tokens);
    if (!result.success) return;
    const newIds = result.data.map((p) => p.id);
    const merged = [...new Set([...personaIds, ...newIds])];
    const updateResult = await updatePanelPersonas(panelId, merged);
    if (updateResult.success) {
      router.refresh();
    }
  };

  const handleRemovePersona = async (personaId: number) => {
    const filtered = personaIds.filter((id) => id !== personaId);
    const result = await updatePanelPersonas(panelId, filtered);
    if (result.success) {
      toast.success(t("DetailPage.removeSuccess"));
      router.refresh();
    }
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium tracking-tight text-muted-foreground uppercase">
            {t("personas")}
          </h2>
          <button
            onClick={() => setShowAddPersona(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="size-3.5" />
            {t("DetailPage.addPersona")}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {personas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              onClick={() => setSelectedPersona(persona)}
              onRemove={() => handleRemovePersona(persona.id)}
            />
          ))}
        </div>
      </div>

      <PersonaDetailDialog
        persona={selectedPersona}
        onOpenChange={() => setSelectedPersona(null)}
      />

      <SelectPersonaDialog
        open={showAddPersona}
        onOpenChange={setShowAddPersona}
        onSelect={handleAddPersonas}
      />
    </>
  );
}
