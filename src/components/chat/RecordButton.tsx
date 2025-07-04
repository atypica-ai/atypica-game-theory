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
}

// Extend the Window interface for vendor-prefixed AudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export function RecordButton({
  onTranscript,
  language,
  disabled = false,
  className,
}: RecordButtonProps) {
  const t = useTranslations("Components.RecordButton");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  const visualize = useCallback(() => {
    if (analyserRef.current) {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += Math.pow((dataArray[i] - 128) / 128, 2);
      }
      setAudioLevel(Math.sqrt(sum / bufferLength));
      animationFrameRef.current = requestAnimationFrame(visualize);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Setup audio visualizer
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

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
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      visualize();
    } catch (error) {
      console.error("Error starting recording:", error);
      // TODO: Show user-friendly error message
    }
  }, [transcribeAudio, visualize]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      setAudioLevel(0);
    }
  }, [isRecording]);

  const handleClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

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
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "transition-all duration-200 flex items-center gap-2 h-10",
        isRecording || isProcessing
          ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40 px-3 rounded-full"
          : "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-full w-10",
        className,
      )}
      disabled={disabled || isProcessing}
      onClick={handleClick}
      aria-label={isRecording ? t("stopRecording") : t("startRecording")}
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs font-medium">{t("processing")}</span>
        </>
      ) : isRecording ? (
        <>
          <Square className="h-4 w-4" />
          <div className="flex items-center space-x-0.5 h-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-0.5 bg-red-500 transition-all duration-75 ease-out rounded-full"
                style={{
                  height: `${Math.max(
                    2,
                    Math.min(
                      12,
                      2 + audioLevel * 60 * (0.6 + Math.sin(Date.now() / 80 + i * 0.4) * 0.4),
                    ),
                  )}px`,
                  opacity: 0.5 + audioLevel * 1.5,
                }}
              />
            ))}
          </div>
          <span className="text-xs font-medium">{t("recording")}</span>
        </>
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </Button>
  );
}
