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
  const transcriptSegmentsRef = useRef<string[]>([]); // Store each transcription segment
  const lastTranscribedChunkIndexRef = useRef<number>(0); // Track which chunks have been transcribed
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const transcribeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTranscribingRef = useRef<boolean>(false);
  const lastTranscribeTimeRef = useRef<number>(0);

  const transcribeSegment = useCallback(
    async (isFinal: boolean = false) => {
      try {
        // Only transcribe new chunks (from last transcribed position to current end)
        const startIndex = lastTranscribedChunkIndexRef.current;
        const chunksToTranscribe = chunksRef.current.slice(startIndex);

        if (chunksToTranscribe.length === 0) {
          console.log("⚠️ No new chunks to transcribe");
          // If this is final call and we have existing segments, send them
          if (isFinal && transcriptSegmentsRef.current.length > 0) {
            const finalText = transcriptSegmentsRef.current.join("\n");
            console.log("✅ No new chunks, sending existing segments:", finalText);
            setPartialTranscript("");
            onTranscript(finalText);
          }
          return;
        }

        const audioBlob = new Blob(chunksToTranscribe, { type: "audio/webm;codecs=opus" });

        if (audioBlob.size < 2000) {
          console.log("⚠️ Audio segment too small for transcription:", audioBlob.size, "bytes");
          // If this is final call and we have existing segments, send them
          if (isFinal && transcriptSegmentsRef.current.length > 0) {
            const finalText = transcriptSegmentsRef.current.join("\n");
            console.log("✅ Segment too small, sending existing segments:", finalText);
            setPartialTranscript("");
            onTranscript(finalText);
          }
          return;
        }

        console.log(`🎙️ Transcribing ${isFinal ? "FINAL" : "SEGMENT"} audio:`, {
          startChunk: startIndex,
          endChunk: chunksRef.current.length,
          newChunkCount: chunksToTranscribe.length,
          size: audioBlob.size,
          language,
        });

        const audioFile = new File([audioBlob], isFinal ? "final.webm" : "segment.webm", {
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
        console.log(`✅ Transcription result (${isFinal ? "FINAL" : "SEGMENT"}):`, result);

        if (result.text && result.text.trim()) {
          const transcriptText = result.text.trim();
          lastTranscriptRef.current = transcriptText;

          // Add this segment to the list
          transcriptSegmentsRef.current.push(transcriptText);

          // Update the last transcribed position
          lastTranscribedChunkIndexRef.current = chunksRef.current.length;

          if (isFinal) {
            // Join all segments with newlines and send final result
            const finalText = transcriptSegmentsRef.current.join("\n");
            console.log("🎯 Final transcript with all segments:", finalText);
            serverLog("🎯 FINAL TRANSCRIPT COMPLETE", {
              segmentCount: transcriptSegmentsRef.current.length,
              finalLength: finalText.length,
            });
            setPartialTranscript("");
            onTranscript(finalText);
          } else {
            // Show partial transcript (all segments so far)
            const partialText = transcriptSegmentsRef.current.join("\n");
            console.log("⚡ Partial transcript updated:", partialText);
            setPartialTranscript(partialText);
            onPartialTranscript?.(partialText);
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
      transcriptSegmentsRef.current = [];
      lastTranscribedChunkIndexRef.current = 0;
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

          // Transcribe new segments every 4 seconds
          const now = Date.now();
          const timeSinceLastTranscribe = now - lastTranscribeTimeRef.current;
          // Calculate total audio size
          const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
          const newChunksCount = chunksRef.current.length - lastTranscribedChunkIndexRef.current;

          const shouldTranscribe =
            newChunksCount >= 4 && totalSize >= 6000 && timeSinceLastTranscribe > 4000; // 4 second minimum interval

          if (shouldTranscribe && !isTranscribingRef.current) {
            console.log(
              "📤 Transcribing new segment:",
              newChunksCount,
              "new chunks,",
              totalSize,
              "bytes total",
            );

            // Set flag to prevent concurrent transcriptions
            isTranscribingRef.current = true;
            lastTranscribeTimeRef.current = now;

            try {
              serverLog("🚀 SEGMENT TRANSCRIPTION START", {
                totalChunks: chunksRef.current.length,
                newChunks: newChunksCount,
                totalSize,
                lastTranscribedIndex: lastTranscribedChunkIndexRef.current,
              });
              await transcribeSegment(false);
            } finally {
              isTranscribingRef.current = false;
            }
          } else {
            console.log("⏸️ Waiting for next segment:", {
              newChunks: newChunksCount,
              totalSize,
              timeSinceLastTranscribe,
              isTranscribing: isTranscribingRef.current,
            });

            // Set a debounced transcription for later
            transcribeTimeoutRef.current = setTimeout(async () => {
              if (
                chunksRef.current.length - lastTranscribedChunkIndexRef.current >= 4 &&
                !isTranscribingRef.current
              ) {
                const currentTotalSize = chunksRef.current.reduce(
                  (sum, chunk) => sum + chunk.size,
                  0,
                );
                if (currentTotalSize >= 6000) {
                  console.log("⏰ Debounced segment transcription executing");
                  isTranscribingRef.current = true;
                  lastTranscribeTimeRef.current = Date.now();

                  try {
                    serverLog("🚀 DEBOUNCED SEGMENT TRANSCRIPTION", {
                      totalChunks: chunksRef.current.length,
                      newChunks: chunksRef.current.length - lastTranscribedChunkIndexRef.current,
                      totalSize: currentTotalSize,
                      lastTranscribedIndex: lastTranscribedChunkIndexRef.current,
                    });
                    await transcribeSegment(false);
                  } finally {
                    isTranscribingRef.current = false;
                  }
                }
              }
            }, 4000); // 4 second debounce
          }
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("🛑 Recording stopped, processing final segment...");

        // Clear any pending debounced transcriptions
        if (transcribeTimeoutRef.current) {
          clearTimeout(transcribeTimeoutRef.current);
          transcribeTimeoutRef.current = null;
        }

        // Wait a moment for any final data to arrive from requestData()
        console.log("⏳ Waiting for final audio chunks...");
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Wait for any ongoing segment transcription to complete
        while (isTranscribingRef.current) {
          console.log("⏳ Waiting for ongoing transcription to complete...");
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Check if there are untranscribed chunks remaining
        const remainingChunks = chunksRef.current.length - lastTranscribedChunkIndexRef.current;
        const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);

        serverLog("🛑 FINAL SEGMENT CHECK", {
          totalChunks: chunksRef.current.length,
          transcribedChunks: lastTranscribedChunkIndexRef.current,
          remainingChunks,
          totalSize,
          segmentCount: transcriptSegmentsRef.current.length,
        });

        if (remainingChunks > 0) {
          // Transcribe the remaining segment (transcribeSegment will check if size is sufficient)
          console.log("🎬 Processing final segment...");
          console.log(`📊 Remaining: ${remainingChunks} chunks`);

          isTranscribingRef.current = true;
          try {
            await transcribeSegment(true);
          } finally {
            isTranscribingRef.current = false;
          }
        } else if (transcriptSegmentsRef.current.length > 0) {
          // No remaining chunks, use existing segments
          const finalText = transcriptSegmentsRef.current.join("\n");
          console.log("✅ Using existing segments, no final transcription needed");
          setPartialTranscript("");
          onTranscript(finalText);
        } else {
          console.log("⚠️ No sufficient audio for transcription");
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
  }, [transcribeSegment, visualize, onTranscript]);

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
      transcriptSegmentsRef.current = [];
      lastTranscribedChunkIndexRef.current = 0;
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
        "transition-all duration-200 flex items-center gap-2 h-10 w-10",
        // 组件输入的 className 需要放这里，后面的状态变化需要覆盖这个 className 里指定的 width 等等
        className,
        isRecording || isProcessing
          ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40 px-3 rounded-full w-auto"
          : "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-full",
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
