import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Mic, Waves, X } from "lucide-react";
import { Locale, useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscript: (text: string) => void;
  language: Locale;
}

// Extend the Window interface for vendor-prefixed AudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export function VoiceInputModal({ isOpen, onClose, onTranscript, language }: VoiceInputModalProps) {
  const t = useTranslations("Components.VoiceInputModal");
  const locale = useLocale();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const transcribeAudio = useCallback(
    async (audioBlob: Blob) => {
      setIsProcessing(true);
      if (audioBlob.size < 500) {
        setIsProcessing(false);
        onClose();
        return;
      }
      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.wav");
        formData.append("locale", language);

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
      } finally {
        setIsProcessing(false);
        onClose();
      }
    },
    [language, onTranscript, onClose],
  );

  const stopRecording = useCallback(
    (processAudio: boolean) => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setAudioLevel(0);

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.onstop = () => {
          if (processAudio) {
            const audioBlob = new Blob(chunksRef.current, { type: "audio/wav" });
            void transcribeAudio(audioBlob);
          }
          streamRef.current?.getTracks().forEach((track) => track.stop());
          if (audioContextRef.current && audioContextRef.current.state !== "closed") {
            audioContextRef.current.close();
          }
          streamRef.current = null;
          mediaRecorderRef.current = null;
          audioContextRef.current = null;
          analyserRef.current = null;
        };
        mediaRecorderRef.current.stop();
      } else {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
          audioContextRef.current.close();
        }
      }

      setIsListening(false);
    },
    [transcribeAudio],
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
      const rms = Math.sqrt(sum / bufferLength);
      setAudioLevel(rms);

      animationFrameRef.current = requestAnimationFrame(visualize);
    }
  }, []);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      mediaRecorder.start();
      setIsListening(true);
      visualize();
    } catch (error) {
      console.error("Error starting recording:", error);
      onClose();
    }
  }, [onClose, visualize]);

  const handleFinish = useCallback(() => {
    setIsProcessing(true);
    stopRecording(true);
  }, [stopRecording]);

  const handleManualClose = useCallback(() => {
    stopRecording(false);
    onClose();
  }, [stopRecording, onClose]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        void startListening();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      stopRecording(false);
    }

    return () => {
      stopRecording(false);
    };
  }, [isOpen, startListening, stopRecording]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative z-10 bg-card/90 backdrop-blur-xl border border-border max-w-md w-full mx-4 text-center overflow-hidden rounded-lg">
        <div className="relative p-8 space-y-6">
          <div className="absolute top-4 left-4">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
              {locale === "zh-CN" ? "中文" : "English"}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground hover:bg-muted z-10"
            onClick={handleManualClose}
            disabled={isProcessing}
          >
            <X />
          </Button>

          <div className="flex items-center justify-center gap-2 text-primary font-mono tracking-tight text-sm">
            <Waves />
            <span className="tracking-wider">
              {isProcessing
                ? t("statusProcessing")
                : isListening
                  ? t("statusListening")
                  : t("statusReady")}
            </span>
            <Waves />
          </div>

          <div className="flex justify-center">
            <div
              className={cn(
                "w-28 h-28 border-2 flex items-center justify-center transition-all duration-300 relative rounded-lg",
                isProcessing
                  ? "border-primary/80 bg-primary/10 text-primary"
                  : isListening
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted-foreground/40 bg-muted/20 text-muted-foreground",
              )}
              style={
                isListening
                  ? {
                      boxShadow: `0 0 ${audioLevel * 40}px rgba(var(--primary-rgb), ${audioLevel * 0.4})`,
                      transform: `scale(${1 + audioLevel * 0.05})`,
                    }
                  : {}
              }
            >
              {isProcessing ? (
                <Loader2 className="size-8 animate-spin" />
              ) : (
                <Mic className="size-8" />
              )}
            </div>
          </div>

          <div className="flex items-center justify-center space-x-1 h-8">
            {isListening &&
              [...Array(25)].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-primary transition-all duration-100 ease-out rounded-full"
                  style={{
                    height: `${Math.max(
                      2,
                      Math.min(
                        28,
                        2 + audioLevel * 200 * (0.5 + Math.sin(Date.now() / 100 + i * 0.5) * 0.5),
                      ),
                    )}px`,
                    opacity: 0.4 + audioLevel * 0.6,
                  }}
                />
              ))}
          </div>

          <div className="space-y-2 min-h-[60px]">
            <h3 className="text-lg font-mono font-bold text-primary tracking-wide">
              {isProcessing ? t("processing") : t("listening")}
            </h3>
            <p className="text-xs text-muted-foreground font-mono font-normal tracking-tight max-w-xs mx-auto leading-relaxed">
              {isProcessing ? t("enhancingMessage") : t("startSpeakingMessage")}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center pt-2 min-h-[68px] gap-3">
            {isListening && (
              <>
                <Button
                  onClick={handleFinish}
                  size="sm"
                  className="px-6 font-mono tracking-tight bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 hover:border-primary/60"
                >
                  {t("finish")}
                </Button>
                <p className="text-xs text-muted-foreground/80 font-mono tracking-tight">
                  {t("finishRecordingHelpText")}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
