import { RequestInteractionFormResult } from "@/app/(interviewProject)/types";
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
  const t = useTranslations("StudyPage.ChatBox");
  const formData = toolInvocation.args as FormData;

  const [formResponses, setFormResponses] = useState<Record<string, any>>({});

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
            <label className="block text-sm font-medium text-gray-900">{field.label}</label>
            {isCompleted ? (
              <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-700">
                {fieldValue || "未填写"}
              </div>
            ) : (
              <Input
                placeholder={field.placeholder}
                value={fieldValue || ""}
                onChange={(e) => updateFieldValue(field.id, e.target.value)}
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            )}
          </div>
        );

      case "choice":
        return (
          <div key={field.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-900">{field.label}</label>
              {!isCompleted && (
                <Badge variant="secondary" className="text-xs">
                  可多选
                </Badge>
              )}
            </div>
            <div className="grid gap-2">
              {field.options?.map((option, index) => {
                const isSelected = Array.isArray(fieldValue)
                  ? fieldValue.includes(option)
                  : fieldValue === option;

                return (
                  <div
                    key={index}
                    onClick={isCompleted ? undefined : () => toggleChoiceOption(field.id, option)}
                    className={cn(
                      "relative p-3 rounded-lg border text-sm transition-all duration-200",
                      isCompleted
                        ? "border-gray-200 bg-gray-50"
                        : "border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50",
                      isSelected && !isCompleted && "border-blue-500 bg-blue-50 text-blue-900",
                      isSelected && isCompleted && "border-green-200 bg-green-50 text-green-900",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("font-medium", isSelected && "text-current")}>
                        {option}
                      </span>
                      {isSelected && (
                        <Check
                          className={cn(
                            "h-4 w-4",
                            isCompleted ? "text-green-600" : "text-blue-600",
                          )}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "boolean":
        return (
          <div key={field.id} className="space-y-3">
            <label className="block text-sm font-medium text-gray-900">{field.label}</label>
            {isCompleted ? (
              <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-700">
                {fieldValue === true ? "是" : fieldValue === false ? "否" : "未选择"}
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant={fieldValue === true ? "default" : "outline"}
                  onClick={() => setBooleanValue(field.id, true)}
                  className={cn("flex-1", fieldValue === true && "bg-blue-600 hover:bg-blue-700")}
                >
                  是
                </Button>
                <Button
                  variant={fieldValue === false ? "default" : "outline"}
                  onClick={() => setBooleanValue(field.id, false)}
                  className={cn("flex-1", fieldValue === false && "bg-blue-600 hover:bg-blue-700")}
                >
                  否
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
    <div className="max-w-2xl mx-auto p-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">信息收集表单</CardTitle>
              <p className="text-sm text-gray-600 mt-1">请填写以下信息以继续访谈</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {formData.prologue && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">
                {formData.prologue}
              </p>
            </div>
          )}

          <div className="space-y-6">{formData.fields.map(renderField)}</div>

          {!isFormCompleted && (
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={submitForm} className="px-6 bg-blue-600 hover:bg-blue-700">
                提交表单
              </Button>
            </div>
          )}

          {isFormCompleted && (
            <div className="flex items-center justify-center pt-4 border-t">
              <div className="flex items-center space-x-2 text-green-600">
                <Check className="h-5 w-5" />
                <span className="text-sm font-medium">表单已提交</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
