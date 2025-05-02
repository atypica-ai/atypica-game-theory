import { cn } from "@/lib/utils";
import { Message } from "ai";
import { SendHorizontalIcon } from "lucide-react";
import * as React from "react";
import { ReactNode } from "react";
import { Button } from "../button";
import { Textarea } from "../textarea";

interface ChatProps {
  messages: Message[];
  input: string;
  isLoading?: boolean;
  disabled?: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  placeholder?: string;
  avatars?: {
    user?: ReactNode;
    assistant?: ReactNode;
    system?: ReactNode;
  };
  className?: string;
}

export function Chat({
  messages,
  input,
  isLoading,
  disabled,
  handleInputChange,
  handleSubmit,
  placeholder = "Type your message...",
  avatars,
  className,
}: ChatProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className={cn("flex flex-col max-h-[800px] overflow-hidden", className)}>
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              // Skip system messages
              if (message.role === "system") return null;

              return (
                <div
                  key={index}
                  className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "flex items-start gap-3 rounded-lg p-3 max-w-[85%]",
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    {message.role !== "user" && avatars?.assistant && (
                      <div className="mt-0.5">{avatars.assistant}</div>
                    )}

                    <div className="flex-1 space-y-2 overflow-hidden">
                      <div className="prose prose-sm dark:prose-invert break-words">
                        {message.content}
                      </div>
                    </div>

                    {message.role === "user" && avatars?.user && (
                      <div className="mt-0.5">{avatars.user}</div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t p-4 bg-background">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="min-h-20 flex-1 resize-none"
            disabled={isLoading || disabled}
            onKeyDown={(e) => {
              const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
              if (!isMobile && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (input.trim()) {
                  const form = e.currentTarget.form;
                  if (form) form.requestSubmit();
                }
              }
            }}
          />
          <div className="flex items-end">
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || disabled || !input.trim()}
              className="h-10 w-10"
            >
              <SendHorizontalIcon className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
