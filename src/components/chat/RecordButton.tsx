import { Button } from "@/components/ui/button";
import { serverLog } from "@/lib/serverLogging";
import { cn } from "@/lib/utils";
import { Loader2, Mic, Square } from "lucide-react";
import { Locale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

interface RecordButtonProps {
  onTranscript: (text: string) => void;
  onPartialTranscript?: (text: string) => void;
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
  onPartialTranscript,
  language,
  disabled = false,
  className,
}: RecordButtonProps) {
  const t = useTranslations("Components.RecordButton");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [partialTranscript, setPartialTranscript] = useState("");
  const lastTranscriptRef = useRef<string>("");
  const fullTranscriptRef = useRef<string>(""); // Accumulate all streaming results
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const transcribeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTranscribingRef = useRef<boolean>(false);
  const lastTranscribeTimeRef = useRef<number>(0);

  const transcribeAccumulatedAudio = useCallback(
    async (isFinal: boolean = false) => {
      try {
        if (chunksRef.current.length === 0) {
          console.log("⚠️ No audio chunks to transcribe");
          return;
        }

        // Create a complete audio file with proper headers
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm;codecs=opus" });

        // Validate minimum audio size
        if (audioBlob.size < 2000) {
          console.log("⚠️ Audio too small for transcription:", audioBlob.size, "bytes");
          return;
        }

        console.log(`🎙️ Transcribing ${isFinal ? "FINAL" : "PARTIAL"} audio:`, {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: chunksRef.current.length,
          language,
          isFinal,
        });

        // Create a new File object to ensure proper format
        const audioFile = new File([audioBlob], isFinal ? "final.webm" : "partial.webm", {
          type: "audio/webm;codecs=opus",
          lastModified: Date.now(),
        });

        const formData = new FormData();
        formData.append("audio", audioFile);
        formData.append("locale", language);
        formData.append("isFinal", isFinal.toString());

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          console.error("❌ Transcription request failed:", response.status, response.statusText);
          const errorText = await response.text();
          console.error("❌ Error details:", errorText);
          throw new Error(`Transcription failed: ${response.status}`);
        }

        const result = await response.json();
        console.log(`✅ Transcription result (${isFinal ? "FINAL" : "PARTIAL"}):`, result);

        if (result.text && result.text.trim()) {
          const transcriptText = result.text.trim();
          lastTranscriptRef.current = transcriptText; // Always update the last transcript

          if (isFinal) {
            // For final transcription, use complete result and replace any streaming result
            console.log("🎯 Setting final transcript (complete):", transcriptText);
            console.log(`📝 Final replaces streaming: "${fullTranscriptRef.current || "none"}"`);
            // Server logging for mobile debugging
            serverLog("🎯 FINAL TRANSCRIPT COMPLETE", {
              finalLength: transcriptText.length,
              previousStreamingText: fullTranscriptRef.current || "empty",
              newText: transcriptText,
              isReplacement: fullTranscriptRef.current ? 1 : 0,
            });
            setPartialTranscript("");
            onTranscript(transcriptText);
          } else {
            console.log("⚡ Setting partial transcript:", transcriptText);
            // Server logging for mobile debugging
            serverLog("⚡ STREAMING TRANSCRIPT UPDATE", {
              newLength: transcriptText.length,
              previousText: fullTranscriptRef.current || "empty",
            });
            // Update accumulated transcript for streaming results
            fullTranscriptRef.current = transcriptText;
            setPartialTranscript(transcriptText);
            onPartialTranscript?.(transcriptText);
          }
        } else {
          console.log("⚠️ No text in transcription result");
        }
      } catch (error) {
        console.error("❌ Error transcribing audio:", error);
        if (isFinal) {
          setIsProcessing(false);
        }
      }
    },
    [language, onTranscript, onPartialTranscript],
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
      console.log("🎙️ Starting audio recording...");

      // Reset transcript state for new recording
      lastTranscriptRef.current = "";
      fullTranscriptRef.current = "";
      setPartialTranscript("");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      console.log("📱 MediaRecorder created with MIME type:", mediaRecorder.mimeType);

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

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          console.log("🔊 Audio chunk received:", event.data.size, "bytes");
          chunksRef.current.push(event.data);

          // Debounce transcription requests to avoid flooding the API
          if (transcribeTimeoutRef.current) {
            clearTimeout(transcribeTimeoutRef.current);
          }

          // Only transcribe if we have meaningful audio and haven't transcribed recently
          const now = Date.now();
          const timeSinceLastTranscribe = now - lastTranscribeTimeRef.current;
          // Calculate total audio size
          const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
          const shouldTranscribe =
            chunksRef.current.length >= 3 && totalSize >= 4000 && timeSinceLastTranscribe > 4000; // 4 second minimum interval

          if (shouldTranscribe && !isTranscribingRef.current) {
            console.log(
              "📤 Processing accumulated audio:",
              chunksRef.current.length,
              "chunks,",
              totalSize,
              "bytes",
            );

            // Set flag to prevent concurrent transcriptions
            isTranscribingRef.current = true;
            lastTranscribeTimeRef.current = now;

            try {
              serverLog("🚀 IMMEDIATE TRANSCRIPTION START", {
                chunksCount: chunksRef.current.length,
                totalSize,
                path: "immediate",
              });
              await transcribeAccumulatedAudio(false);
            } finally {
              isTranscribingRef.current = false;
            }
          } else {
            console.log("⏸️ Debouncing transcription:", {
              chunks: chunksRef.current.length,
              totalSize,
              timeSinceLastTranscribe,
              isTranscribing: isTranscribingRef.current,
            });

            // Set a debounced transcription for later
            transcribeTimeoutRef.current = setTimeout(async () => {
              if (chunksRef.current.length >= 3 && !isTranscribingRef.current) {
                const currentTotalSize = chunksRef.current.reduce(
                  (sum, chunk) => sum + chunk.size,
                  0,
                );
                if (currentTotalSize >= 4000) {
                  console.log("⏰ Debounced transcription executing");
                  isTranscribingRef.current = true;
                  lastTranscribeTimeRef.current = Date.now();

                  try {
                    const currentTotalSize = chunksRef.current.reduce(
                      (sum, chunk) => sum + chunk.size,
                      0,
                    );
                    serverLog("🚀 DEBOUNCED TRANSCRIPTION START", {
                      chunksCount: chunksRef.current.length,
                      totalSize: currentTotalSize,
                      path: "debounced",
                    });
                    await transcribeAccumulatedAudio(false);
                  } finally {
                    isTranscribingRef.current = false;
                  }
                }
              }
            }, 3000); // 3 second debounce
          }
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("🛑 Recording stopped, processing final audio...");

        // Clear any pending debounced transcriptions
        if (transcribeTimeoutRef.current) {
          clearTimeout(transcribeTimeoutRef.current);
          transcribeTimeoutRef.current = null;
        }

        // Wait a moment for any final data to arrive from requestData()
        console.log("⏳ Waiting for final audio chunks...");
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Wait for any ongoing streaming transcription to complete
        while (isTranscribingRef.current) {
          console.log("⏳ Waiting for ongoing transcription to complete...");
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Smart wait for streaming transcription completion - check periodically instead of fixed wait
        console.log("⏳ Smart wait for streaming transcription completion...");
        let waitTime = 0;
        const maxWait = 3000; // 3 seconds maximum
        const checkInterval = 200; // Check every 200ms
        
        while (!fullTranscriptRef.current && waitTime < maxWait) {
          await new Promise((resolve) => setTimeout(resolve, checkInterval));
          waitTime += checkInterval;
          
          if (waitTime % 1000 === 0) {
            console.log(`⏳ Still waiting for streaming result... ${waitTime/1000}s elapsed`);
          }
        }
        
        if (fullTranscriptRef.current) {
          console.log(`✅ Streaming result received after ${waitTime}ms wait`);
        } else {
          console.log(`⏰ Timeout after ${waitTime}ms, proceeding without streaming result`);
        }

        // Simple logic: Check if we have audio to transcribe
        const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);

        // Check streaming result status after smart wait
        serverLog("🔍 STREAMING RESULT CHECK AFTER SMART WAIT", {
          fullTranscriptLength: fullTranscriptRef.current?.length || 0,
          fullTranscriptContent: fullTranscriptRef.current || "empty",
          lastTranscriptContent: lastTranscriptRef.current || "empty",
          actualWaitTime: waitTime,
          maxWaitTime: maxWait,
          waitEfficiency: fullTranscriptRef.current ? (waitTime / maxWait * 100).toFixed(1) + "%" : "timeout",
        });

        serverLog("🛑 FINAL TRANSCRIPTION DECISION", {
          totalChunks: chunksRef.current.length,
          totalSize: totalSize,
          hasStreamingResult: fullTranscriptRef.current ? 1 : 0,
          willDoFinalTranscription: totalSize > 2000 ? 1 : 0,
        });

        if (totalSize > 2000) {
          // Always do final transcription to ensure no audio is missed
          console.log("🎬 Processing complete audio for final transcription...");
          console.log(
            `📊 Total audio: ${chunksRef.current.length} chunks, size: ${totalSize} bytes`,
          );
          
          if (fullTranscriptRef.current && fullTranscriptRef.current.trim()) {
            console.log("ℹ️ Note: Streaming result available, final transcription will replace it");
            serverLog("ℹ️ FINAL TRANSCRIPTION WITH STREAMING BACKUP", {
              streamingLength: fullTranscriptRef.current.length,
              reason: "ensure_completeness",
            });
          } else {
            console.log("ℹ️ No streaming result, final transcription is primary");
            serverLog("ℹ️ FINAL TRANSCRIPTION PRIMARY", {
              reason: "no_streaming_result",
            });
          }
          
          isTranscribingRef.current = true;
          try {
            await transcribeAccumulatedAudio(true);
          } finally {
            isTranscribingRef.current = false;
          }
        } else if (fullTranscriptRef.current && fullTranscriptRef.current.trim()) {
          // Audio too small for final transcription, but we have streaming result
          console.log("✅ Audio too small, using streaming result:", fullTranscriptRef.current);
          serverLog("✅ USING STREAMING RESULT ONLY", {
            cachedLength: fullTranscriptRef.current.length,
            reason: "audio_too_small",
          });
          setPartialTranscript("");
          onTranscript(fullTranscriptRef.current);
        } else {
          console.log("⚠️ No sufficient audio for transcription and no streaming result");
        }

        // Clean up stream
        stream.getTracks().forEach((track) => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }

        setIsProcessing(false);
        console.log("🧹 Audio recording cleanup completed");
      };

      // Start recording with regular intervals for streaming
      mediaRecorder.start(1000); // Capture data every 1 second for better coverage
      console.log("▶️ Recording started with 1s intervals");
      setIsRecording(true);
      visualize();
    } catch (error) {
      console.error("❌ Error starting recording:", error);
      // TODO: Show user-friendly error message
    }
  }, [transcribeAccumulatedAudio, visualize, onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      console.log("⏹️ Stopping recording...");
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Request one final data chunk before stopping
      console.log("📤 Requesting final data chunk...");
      mediaRecorderRef.current.requestData();

      // Small delay to ensure final data is captured
      setTimeout(() => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
        }
      }, 100);

      setIsRecording(false);
      setIsProcessing(true);
      setAudioLevel(0);
      // Don't clear partialTranscript here - let onstop handler decide
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

      // Clear any pending timeouts
      if (transcribeTimeoutRef.current) {
        clearTimeout(transcribeTimeoutRef.current);
      }

      // Reset transcription state
      isTranscribingRef.current = false;
      lastTranscriptRef.current = "";
      fullTranscriptRef.current = "";
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
