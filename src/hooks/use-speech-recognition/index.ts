import { Locale } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { correctSpeechText } from "./actions";

// Define types for the SpeechRecognition API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

// Window augmentation
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

interface UseSpeechRecognitionProps {
  language: Locale;
  contextText?: string;
  onResult?: (text: string) => void;
  onFinalResult?: (text: string) => void;
  onError?: (error: Error) => void;
}

export function useSpeechRecognition({
  language,
  contextText,
  onResult,
  onFinalResult,
  onError,
}: UseSpeechRecognitionProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fullTranscriptRef = useRef<string>("");

  const callbackRef = useRef({ onResult, onFinalResult, onError });

  // Update callback refs when props change
  useEffect(() => {
    callbackRef.current = { onResult, onFinalResult, onError };
  }, [onResult, onFinalResult, onError]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const startAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);

      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      microphoneRef.current.connect(analyserRef.current);

      const updateAudioLevel = () => {
        if (analyserRef.current && !animationFrameRef.current) return;
        analyserRef.current?.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        setAudioLevel(average / 255);
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  }, []);

  const stopAudioAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setAudioLevel(0);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
        const instance = new SpeechRecognition();
        instance.continuous = true;
        instance.interimResults = true;
        instance.lang = language;
        instance.onresult = async (event: SpeechRecognitionEvent) => {
          let interimTranscript = "";
          let newFinalTranscript = "";

          // Process only new results from this event
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              newFinalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          // Update the full transcript with new final results only
          if (newFinalTranscript) {
            fullTranscriptRef.current += newFinalTranscript;
          }

          // Show current state (accumulated final + current interim)
          const currentTranscript = fullTranscriptRef.current + interimTranscript;
          setTranscript(currentTranscript);
          callbackRef.current.onResult?.(currentTranscript);

          // Process and send final result when we have new final text
          if (newFinalTranscript) {
            setIsProcessing(true);
            try {
              const correctedText = await correctSpeechText(fullTranscriptRef.current, contextText);
              setTranscript(correctedText);
              callbackRef.current.onFinalResult?.(correctedText);
            } catch (error) {
              console.error("Error correcting speech text:", error);
              callbackRef.current.onFinalResult?.(fullTranscriptRef.current);
            } finally {
              setIsProcessing(false);
            }
          }
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        instance.onerror = (event: any) => {
          setIsListening(false);
          const error = new Error(`Speech recognition error: ${event.error}`);
          console.error(error);
          callbackRef.current.onError?.(error);
        };
        instance.onend = () => {
          setIsListening(false);
        };
        recognitionRef.current = instance;
      }
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      stopAudioAnalysis();
    };
  }, [language, contextText, stopAudioAnalysis]);

  const startListening = useCallback(async () => {
    if (recognitionRef.current && !isListening) {
      try {
        // Reset all transcript state completely
        fullTranscriptRef.current = "";
        setTranscript("");
        setIsProcessing(false);
        setAudioLevel(0);

        recognitionRef.current.start();
        setIsListening(true);

        // Start audio analysis inline
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioContextRef.current = new AudioContext();
          analyserRef.current = audioContextRef.current.createAnalyser();
          microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);

          analyserRef.current.fftSize = 256;
          const bufferLength = analyserRef.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          microphoneRef.current.connect(analyserRef.current);

          const updateAudioLevel = () => {
            if (analyserRef.current && animationFrameRef.current !== null) {
              analyserRef.current.getByteFrequencyData(dataArray);
              const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
              setAudioLevel(average / 255);
              animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
            }
          };

          updateAudioLevel();
        } catch (audioError) {
          console.error("Error accessing microphone:", audioError);
        }
      } catch (error) {
        console.error("Error starting speech recognition:", error);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
    }
    setIsListening(false);

    // Stop audio analysis inline
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setAudioLevel(0);
  }, []);

  const resetRecognition = useCallback(() => {
    // Stop current recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    // Reset all states
    setIsListening(false);
    setTranscript("");
    setIsProcessing(false);
    fullTranscriptRef.current = "";

    // Stop audio analysis
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setAudioLevel(0);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    transcript,
    isProcessing,
    audioLevel,
    startListening,
    stopListening,
    toggleListening,
    resetRecognition,
  };
}
