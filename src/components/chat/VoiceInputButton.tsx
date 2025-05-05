import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { cn } from "@/lib/utils";
import { MicIcon, MicOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  language?: string;
  disabled?: boolean;
  className?: string;
}

export function VoiceInputButton({
  onTranscript,
  language = "zh-CN",
  disabled = false,
  className,
}: VoiceInputButtonProps) {
  const t = useTranslations("Components.VoiceInputButton");
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [activeText, setActiveText] = useState<string>("");

  const { isListening, isSupported, toggleListening, stopListening } = useSpeechRecognition({
    language,
    onResult: useCallback((text: string) => {
      setActiveText(text);
    }, []),
    onFinalResult: useCallback(
      (text: string) => {
        if (text.trim()) {
          onTranscript(text);
        }
        setActiveText("");
      },
      [onTranscript],
    ),
    onError: useCallback(() => {
      setActiveText("");
      // stopListening();
    }, []),
  });

  // Stop listening when component is disabled
  useEffect(() => {
    if (disabled && isListening) {
      stopListening();
    }
  }, [disabled, isListening, stopListening]);

  if (!isSupported) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip open={tooltipOpen || isListening} onOpenChange={setTooltipOpen}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className={cn(
              "h-9 w-9 rounded-full",
              isListening && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
              className,
            )}
            disabled={disabled}
            onClick={toggleListening}
            aria-label={isListening ? t("stopListening") : t("startListening")}
          >
            {isListening ? <MicOffIcon className="h-4 w-4" /> : <MicIcon className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {isListening
            ? activeText
              ? `${t("listeningActive")}: ${activeText}`
              : t("listeningActive")
            : t("clickToSpeak")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
