"use client";
import { personaBuildSchemaStreamObject } from "@/ai/tools/experts/buildPersonaStreamObject/types";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { cn } from "@/lib/utils";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useCallback } from "react";
import { z } from "zod/v3";

export function BuildPersonaStreamObjectClient({
  chatId,
  useObjectAPI,
}: {
  chatId: string;
  useObjectAPI: string;
}) {
  const { object, submit, isLoading, stop } = useObject({
    api: useObjectAPI,
    // schema: z.record(z.string(), personaBuildSchemaStreamObject()),
    schema: z.array(personaBuildSchemaStreamObject()),
  });

  const generateObject = useCallback(() => {
    submit({ id: chatId });
  }, [submit, chatId]);

  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  return (
    <FitToViewport
      className={cn(
        "flex-1 overflow-hidden",
        "flex flex-col items-stretch justify-start gap-4 w-full max-w-5xl mx-auto p-3",
      )}
    >
      <div>
        {isLoading ? (
          <div className="flex flex-row items-center gap-4">
            <Button type="button" onClick={() => stop()}>
              Stop
            </Button>
            <div className="text-xs">Generating personas...</div>
          </div>
        ) : (
          <Button onClick={generateObject} disabled={isLoading}>
            Generate personas
          </Button>
        )}
      </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 flex flex-col gap-6 w-full items-stretch overflow-y-auto scrollbar-thin"
      >
        <pre className="whitespace-pre-wrap text-xs">
          {(() => {
            try {
              return JSON.stringify(object, null, 2);
            } catch (error) {
              console.error("Error parsing object:", error);
              return "Malformed JSON";
            }
          })()}
        </pre>
        {/* {Object.entries(object ?? {}).map(([key, persona]) => (
          <div key={key}>
            <div className="whitespace-pre-wrap text-sm font-bold">#{key}</div>
            {Object.entries(persona ?? {}).map(([field, value]) => (
              <div className="whitespace-pre-wrap text-xs" key={field}>
                {field}: {value}
              </div>
            ))}
          </div>
        ))} */}
        <div ref={messagesEndRef} />
      </div>
    </FitToViewport>
  );
}
