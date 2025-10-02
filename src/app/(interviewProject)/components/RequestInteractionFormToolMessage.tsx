import { RequestInteractionFormResult } from "@/app/(interviewProject)/tools/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ToolInvocation } from "ai";
import { Check, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { FC, useCallback, useState } from "react";

interface FormField {
  id: string;
  label: string;
  type: "text" | "choice" | "boolean";
  placeholder?: string;
  options?: string[];
}

interface FormData {
  prologue: string;
  fields: FormField[];
}

export const RequestInteractionFormToolMessage: FC<{
  toolInvocation: ToolInvocation;
  addToolResult?: ({
    toolCallId,
    result,
  }: {
    toolCallId: string;
    result: RequestInteractionFormResult;
  }) => void;
}> = ({ toolInvocation, addToolResult }) => {
  const t = useTranslations("InterviewProject.requestInteractionForm");
  const formData = toolInvocation.args as FormData;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formResponses, setFormResponses] = useState<Record<string, any>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateFieldValue = useCallback((fieldId: string, value: any) => {
    setFormResponses((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  }, []);

  const toggleChoiceOption = useCallback((fieldId: string, option: string) => {
    setFormResponses((prev) => {
      const current = prev[fieldId];
      if (Array.isArray(current)) {
        if (current.includes(option)) {
          return { ...prev, [fieldId]: current.filter((o) => o !== option) };
        } else {
          return { ...prev, [fieldId]: [...current, option] };
        }
      } else {
        return { ...prev, [fieldId]: [option] };
      }
    });
  }, []);

  const setBooleanValue = useCallback((fieldId: string, value: boolean) => {
    setFormResponses((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  }, []);

  const submitForm = useCallback(() => {
    if (toolInvocation.state !== "result" && addToolResult) {
      addToolResult({
        toolCallId: toolInvocation.toolCallId,
        result: {
          formResponses: formResponses,
          plainText: Object.entries(formResponses)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n"),
        },
      });
    }
  }, [toolInvocation.state, toolInvocation.toolCallId, addToolResult, formResponses]);

  const isFormCompleted = toolInvocation.state === "result";
  const resultData = isFormCompleted ? toolInvocation.result?.formData : undefined;

  const renderField = (field: FormField) => {
    const isCompleted = isFormCompleted;
    const fieldValue = isCompleted ? resultData?.[field.id] : formResponses[field.id];

    switch (field.type) {
      case "text":
        return (
          <div key={field.id} className="space-y-3">
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-300">
              {field.label}
            </label>
            {isCompleted ? (
              <div className="p-3 bg-zinc-50 rounded-lg border text-sm text-zinc-700">
                {fieldValue || t("notFilled")}
              </div>
            ) : (
              <Input
                placeholder={field.placeholder}
                value={fieldValue || ""}
                onChange={(e) => updateFieldValue(field.id, e.target.value)}
                className="border focus:border-primary focus:ring-primary"
              />
            )}
          </div>
        );

      case "choice":
        return (
          <div key={field.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-300">
                {field.label}
              </label>
              {!isCompleted && (
                <Badge variant="secondary" className="text-xs">
                  {t("multipleChoice")}
                </Badge>
              )}
            </div>
            <div className="grid gap-2">
              {field.options?.map((option, index) => {
                const isSelected = Array.isArray(fieldValue)
                  ? fieldValue.includes(option)
                  : fieldValue === option;
                return (
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    key={index}
                    onClick={isCompleted ? undefined : () => toggleChoiceOption(field.id, option)}
                    className="flex items-center justify-between"
                  >
                    {option}
                    {isSelected && <Check className="h-4 w-4" />}
                  </Button>
                );
              })}
            </div>
          </div>
        );

      case "boolean":
        return (
          <div key={field.id} className="space-y-3">
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-300">
              {field.label}
            </label>
            {isCompleted ? (
              <div className="p-3 bg-zinc-50 rounded-lg border text-sm text-zinc-700">
                {fieldValue === true ? t("yes") : fieldValue === false ? t("no") : t("notSelected")}
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant={fieldValue === true ? "default" : "outline"}
                  onClick={() => setBooleanValue(field.id, true)}
                  className={cn("flex-1", fieldValue === true && "bg-primary")}
                >
                  {t("yes")}
                </Button>
                <Button
                  variant={fieldValue === false ? "default" : "outline"}
                  onClick={() => setBooleanValue(field.id, false)}
                  className={cn("flex-1", fieldValue === false && "bg-primary")}
                >
                  {t("no")}
                </Button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="shrink-0 w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm sm:text-base font-normal leading-tight">
              {formData.prologue || t("defaultPrologue")}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-6">{formData.fields.map(renderField)}</div>

          {!isFormCompleted && (
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={submitForm}>{t("submitForm")}</Button>
            </div>
          )}

          {isFormCompleted && (
            <div className="flex items-center justify-center pt-4 border-t">
              <div className="flex items-center space-x-2 text-primary">
                <Check className="h-5 w-5" />
                <span className="text-sm font-medium">{t("formSubmitted")}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
