import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { cn } from "@/lib/utils";
import { Loader2, Mic, Waves, X } from "lucide-react";
import { Locale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscript: (text: string) => void;
  language: Locale;
  contextText?: string;
}

export function VoiceInputModal({
  isOpen,
  onClose,
  onTranscript,
  language,
  contextText,
}: VoiceInputModalProps) {
  const t = useTranslations("Components.VoiceInputModal");
  const [displayedText, setDisplayedText] = useState("");

  const { isListening, isProcessing, audioLevel, transcript, startListening, stopListening } =
    useSpeechRecognition({
      language,
      contextText,
      onFinalResult: useCallback(
        (text: string) => {
          if (text.trim()) {
            onTranscript(text);
            onClose();
          }
        },
        [onTranscript, onClose],
      ),
      onError: useCallback(() => {
        onClose();
      }, [onClose]),
    });

  // Typewriter effect for transcript
  useEffect(() => {
    if (transcript) {
      const targetText = transcript;
      const currentLength = displayedText.length;

      if (targetText.length > currentLength) {
        const timer = setTimeout(() => {
          setDisplayedText(targetText.slice(0, currentLength + 1));
        }, 30); // Typing speed
        return () => clearTimeout(timer);
      } else if (targetText.length < currentLength) {
        // Instant update when text gets shorter (correction)
        setDisplayedText(targetText);
      }
    } else {
      setDisplayedText("");
    }
  }, [transcript, displayedText]);

  const handleFinish = useCallback(() => {
    if (isListening) {
      stopListening();
    }
  }, [isListening, stopListening]);

  const handleManualClose = useCallback(() => {
    stopListening();
    onClose();
  }, [stopListening, onClose]);

  // Auto start listening when modal opens and reset displayed text
  useEffect(() => {
    if (isOpen) {
      setDisplayedText(""); // Reset displayed text when modal opens
      const timer = setTimeout(() => {
        startListening();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, startListening]);

  // Prevent body scroll when modal is open
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
        {/* Subtle gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="absolute inset-0 border border-primary/20 animate-pulse rounded-lg" />

        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground hover:bg-muted z-10"
          onClick={handleManualClose}
        >
          <X />
        </Button>

        {/* Main content */}
        <div className="relative p-8 space-y-6">
          {/* Status indicator */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-primary heading-mono text-sm">
              <Waves />
              <span className="tracking-wider">
                {isProcessing ? "PROCESSING" : isListening ? "LISTENING" : "READY"}
              </span>
              <Waves />
            </div>
          </div>

          {/* AI Microphone Interface */}
          <div className="flex justify-center pb-2">
            <div className="relative">
              {/* Main microphone circle */}
              <div
                className={cn(
                  "w-28 h-28 border-2 flex items-center justify-center transition-all duration-500 relative rounded-lg",
                  isProcessing
                    ? "border-primary/80 bg-primary/10 text-primary"
                    : isListening
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/40 bg-muted/20 text-muted-foreground",
                )}
              >
                {isProcessing ? (
                  <div className="relative">
                    <Loader2 className="size-8 animate-spin" />
                    <div className="absolute inset-0 bg-primary/20 animate-pulse rounded-full" />
                  </div>
                ) : (
                  <Mic className="size-8" />
                )}
              </div>

              {/* Scanning lines effect when listening */}
              {isListening && (
                <>
                  <div
                    className="absolute inset-0 border border-primary/40 animate-ping rounded-lg"
                    style={{
                      animationDuration: "2s",
                    }}
                  />
                  <div
                    className="absolute inset-0 border border-primary/20 animate-ping rounded-lg"
                    style={{
                      animationDuration: "3s",
                      animationDelay: "0.5s",
                    }}
                  />
                </>
              )}

              {/* Processing grid overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-pulse rounded-lg" />
              )}
            </div>
          </div>

          {/* Real-time transcript display */}
          {(isListening || isProcessing) && (
            <div className="space-y-3">
              {/* Transcript text with typewriter effect */}
              <div
                className={cn(
                  "min-h-[80px] max-h-[120px] overflow-y-auto bg-muted/40 border rounded p-4 relative transition-all duration-200",
                  audioLevel > 0.1 && isListening
                    ? "border-primary/60 bg-primary/5 shadow-lg shadow-primary/20"
                    : "border-border",
                )}
              >
                {/* Subtle grid overlay */}
                <div
                  className={cn(
                    "absolute inset-0 pointer-events-none transition-opacity duration-200 rounded",
                    audioLevel > 0.1 && isListening
                      ? "opacity-20 bg-gradient-to-br from-primary/20 via-transparent to-primary/30"
                      : "opacity-10 bg-gradient-to-br from-primary/10 via-transparent to-primary/20",
                  )}
                />

                {displayedText ? (
                  <div className="text-left relative z-10">
                    <span
                      className={cn(
                        "heading-mono text-sm leading-relaxed break-words transition-all duration-150",
                        audioLevel > 0.1 && isListening
                          ? "text-foreground drop-shadow-sm"
                          : "text-foreground",
                      )}
                    >
                      {displayedText}
                      {isListening && !isProcessing && (
                        <span
                          className={cn(
                            "font-bold transition-all duration-150",
                            audioLevel > 0.1
                              ? "animate-pulse text-primary"
                              : "animate-pulse text-primary",
                          )}
                        >
                          |
                        </span>
                      )}
                    </span>
                    {/* Enhanced glowing text effect */}
                    {isListening && displayedText && audioLevel > 0.1 && (
                      <div className="absolute inset-0 text-primary/40 heading-mono text-sm leading-relaxed break-words animate-pulse pointer-events-none blur-sm">
                        {displayedText}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 h-1 bg-green-400 rounded-full animate-pulse"
                            style={{ animationDelay: `${i * 200}ms` }}
                          />
                        ))}
                      </div>
                      <span
                        className={cn(
                          "heading-mono text-xs transition-all duration-200",
                          audioLevel > 0.1 && isListening
                            ? "text-muted-foreground animate-pulse"
                            : "text-muted-foreground/60",
                        )}
                      >
                        {isListening ? "Listening for your voice..." : "Processing..."}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Audio visualizer - Enhanced terminal style */}
              {isListening && (
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-1 h-6 font-mono">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="w-0.5 bg-primary transition-all duration-75 ease-out rounded-full shadow-sm"
                        style={{
                          height: `${Math.max(
                            2,
                            Math.min(
                              24,
                              2 +
                                audioLevel * 22 * (0.4 + Math.sin(Date.now() / 60 + i * 0.3) * 0.6),
                            ),
                          )}px`,
                          opacity: 0.3 + audioLevel * 0.7,
                        }}
                      />
                    ))}
                  </div>
                  {/* Audio level indicator */}
                  {audioLevel > 0.05 && (
                    <div className="text-center">
                      <span
                        className={cn(
                          "text-xs heading-mono animate-pulse transition-all duration-200",
                          audioLevel > 0.2 ? "text-primary" : "text-primary/80",
                        )}
                      >
                        ♪ {audioLevel > 0.2 ? "Speaking detected" : "Audio detected"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status text */}
          <div className="space-y-2">
            <h3 className="text-lg heading-mono font-bold text-primary tracking-wide">
              {isProcessing ? t("processing") : isListening ? t("listening") : t("startListening")}
            </h3>
            <p className="text-xs text-muted-foreground heading-mono max-w-xs mx-auto leading-relaxed">
              {isProcessing
                ? "Enhancing your speech with AI..."
                : isListening
                  ? displayedText
                    ? "Keep speaking or click finish when done"
                    : "Start speaking now..."
                  : t("clickToStart")}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex justify-center pt-4">
            {!isListening && !isProcessing && (
              <Button
                onClick={startListening}
                size="sm"
                className="px-6 heading-mono bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 hover:border-primary/60"
              >
                {t("startListening")}
              </Button>
            )}

            {isListening && (
              <Button
                onClick={handleFinish}
                size="sm"
                className="px-6 heading-mono bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 hover:border-primary/60"
              >
                {t("finish")}
              </Button>
            )}
          </div>

          {/* Help text */}
          <p className="text-xs text-muted-foreground/60 heading-mono max-w-xs mx-auto">
            {isListening || isProcessing ? t("recordingHelpText") : t("helpText")}
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
