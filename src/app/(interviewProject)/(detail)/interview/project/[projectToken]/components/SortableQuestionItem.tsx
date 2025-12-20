import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InterviewProjectQuestion } from "@/prisma/client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EditIcon, GripVerticalIcon, TrashIcon } from "lucide-react";
import { useTranslations } from "next-intl";

// Sortable Question Item Component
export function SortableQuestionItem({
  question,
  index,
  sortableId,
  onEdit,
  onDelete,
  readOnly,
}: {
  question: InterviewProjectQuestion;
  index: number;
  sortableId: string;
  onEdit: () => void;
  onDelete: () => void;
  readOnly: boolean;
}) {
  const t = useTranslations("InterviewProject.projectDetails");

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start justify-between gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors",
        isDragging && "z-50",
      )}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {!readOnly && (
          <button
            {...attributes}
            {...listeners}
            className="bg-muted hover:bg-muted/80 rounded p-1 flex items-center justify-center shrink-0 mt-0.5 cursor-grab active:cursor-grabbing"
          >
            <GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        <div className="bg-primary/20 rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-medium text-primary">{index + 1}</span>
        </div>
        <p className="text-sm leading-relaxed wrap-break-word">{question.text}</p>
      </div>
      {!readOnly && (
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 px-2">
            <EditIcon className="h-3 w-3 mr-1" />
            {t("edit")}
          </Button>
          <ConfirmDialog title={`${t("delete")}?`} description={question.text} onConfirm={onDelete}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
              <TrashIcon className="h-3 w-3" />
            </Button>
          </ConfirmDialog>
        </div>
      )}
    </div>
  );
}
