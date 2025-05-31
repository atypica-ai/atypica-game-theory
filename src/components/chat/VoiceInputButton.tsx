import { Button } from "@/components/ui/button";
import { MicIcon } from "lucide-react";
import { Locale } from "next-intl";
import { useState } from "react";
import { VoiceInputModal } from "./VoiceInputModal";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  language: Locale;
  disabled?: boolean;
  className?: string;
  contextText?: string;
}

export function VoiceInputButton({
  onTranscript,
  language,
  disabled = false,
  className,
  contextText,
}: VoiceInputButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  // Check if speech recognition is supported
  if (typeof window !== "undefined") {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return null;
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className={className}
        disabled={disabled}
        onClick={() => {
          setModalKey(prev => prev + 1);
          setIsModalOpen(true);
        }}
        aria-label="Start voice input"
      >
        <MicIcon />
      </Button>

      <VoiceInputModal
        key={modalKey}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTranscript={onTranscript}
        language={language}
        contextText={contextText}
      />
    </>
  );
}
