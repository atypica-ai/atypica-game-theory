import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Mic, Square } from "lucide-react";
import { Locale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

interface RecordButtonProps {
  onTranscript: (text: string) => void;
  language: Locale;
  disabled?: boolean;
  className?: string;
  autoStart?: boolean;
}

// Simple recording indicator
function RecordingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
      <span className="text-xs text-zinc-500 dark:text-zinc-400">Recording</span>
    </div>
  );
}

export function RecordButton({
  onTranscript,
  language,
  disabled = false,
  className,
  autoStart = false,
}: RecordButtonProps) {
  const t = useTranslations("Components.RecordButton");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const transcribeAudio = useCallback(
    async (audioBlob: Blob) => {
      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.wav");
        formData.append("language", language);

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Transcription failed");
        }

        const result = await response.json();
        if (result.text && result.text.trim()) {
          onTranscript(result.text.trim());
        }
      } catch (error) {
        console.error("Error transcribing audio:", error);
        // TODO: Show user-friendly error message
      } finally {
        setIsProcessing(false);
      }
    },
    [language, onTranscript],
  );

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/wav" });
        await transcribeAudio(audioBlob);

        // Clean up stream
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      // TODO: Show user-friendly error message
    }
  }, [transcribeAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  }, [isRecording]);

  const handleClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Auto start recording when autoStart prop is true
  useEffect(() => {
    if (autoStart && !isRecording && !isProcessing && !disabled) {
      startRecording();
    }
  }, [autoStart, isRecording, isProcessing, disabled, startRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  // Check if browser supports audio recording
  // const isSupported =
  //   typeof navigator !== "undefined" &&
  //   navigator.mediaDevices &&
  //   navigator.mediaDevices.getUserMedia;
  // TODO
  // if (!isSupported) {
  //   return null;
  // }

  return (
    <div className="flex items-center gap-3">
      {/* Recording status */}
      {isRecording && <RecordingIndicator />}
      {isProcessing && <span className="text-xs text-zinc-500">{t("processing")}</span>}

      {/* Record button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "rounded-full transition-all duration-200",
          isRecording
            ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40"
            : "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600",
          className,
        )}
        disabled={disabled || isProcessing}
        onClick={handleClick}
        aria-label={isRecording ? t("stopRecording") : t("startRecording")}
      >
        {isProcessing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isRecording ? (
          <Square className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
