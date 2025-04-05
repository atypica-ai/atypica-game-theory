"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createUserChat } from "@/data";
import { debounce } from "@/lib/utils";
import { ArrowRightIcon, RotateCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function InputSection() {
  const t = useTranslations("HomePage.InputSection");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Safely initialize from localStorage after component mounts
  const debouncedSaveToLocalStorage = useCallback(
    debounce((value: string) => {
      localStorage.setItem("studyInputCache", value);
    }, 300),
    [],
  );

  useEffect(() => {
    const savedInput = localStorage.getItem("studyInputCache");
    if (savedInput) {
      setInput(savedInput);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setIsLoading(true);
    try {
      const chat = await createUserChat("study", {
        role: "user",
        content: input,
      });
      // Clear input cache after successfully creating chat
      localStorage.removeItem("studyInputCache");
      router.push(`/study/?id=${chat.id}`);
    } catch (error) {
      console.error("Error saving input:", error);
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <Textarea
          value={input}
          onChange={(e) => {
            const value = e.target.value;
            setInput(value);
            debouncedSaveToLocalStorage(value);
          }}
          placeholder={t("placeholder")}
          className="min-h-48 resize-none focus-visible:border-primary/70 transition-colors rounded-none p-5 border-2"
          enterKeyHint="enter"
          disabled={isLoading}
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
        <Button
          type="submit"
          variant="secondary"
          disabled={isLoading || !input.trim()}
          className="rounded-full size-9 absolute right-4 bottom-4"
        >
          {isLoading ? (
            <RotateCwIcon className="h-4 w-4 text-primary animate-spin" />
          ) : (
            <ArrowRightIcon className="h-4 w-4 text-primary" />
          )}
        </Button>
      </form>
    </div>
  );
}
