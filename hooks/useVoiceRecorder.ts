import { useState, useCallback, useRef, useEffect } from "react";
import { Platform } from "react-native";
import { Audio } from "expo-av";
import { useMutation } from "@tanstack/react-query";

interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
}

interface UseVoiceRecorderOptions {
  onPartialTranscription?: (text: string) => void;
  chunkDurationMs?: number;
  minSilenceThreshold?: number;
}

interface UseVoiceRecorderReturn extends RecordingState {
  latestTranscript: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
}

type MediaRecorderDataEvent = {
  data: Blob;
};

export function useVoiceRecorder(options?: UseVoiceRecorderOptions): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestTranscript, setLatestTranscript] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldContinueRef = useRef(false);
  const transcriptsRef = useRef<string[]>([]);
  const webProcessingRef = useRef(false);
  const nativeProcessingPromiseRef = useRef<Promise<void>>(Promise.resolve());
  const audioModeActiveRef = useRef(false);
  const startNativeChunkRef = useRef<() => Promise<void>>(async () => {});
  const processNativeChunkRef = useRef<(shouldRestart: boolean) => Promise<void>>(async () => {});
  const chunkDurationRef = useRef<number>(options?.chunkDurationMs ?? 2500); // 2500ms default for better responsiveness
  const transcriptionCallbackRef = useRef<(text: string) => void | undefined>(
    options?.onPartialTranscription,
  );

  useEffect(() => {
    chunkDurationRef.current = options?.chunkDurationMs ?? 2500;
  }, [options?.chunkDurationMs]);

  useEffect(() => {
    transcriptionCallbackRef.current = options?.onPartialTranscription;
  }, [options?.onPartialTranscription]);

  const transcribeMutation = useMutation({
    mutationFn: async (audioUri: string) => {
      console.log("[Voice] Transcribing audio...");
      
      let lastError: any;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const formData = new FormData();

          if (Platform.OS === "web") {
            const response = await fetch(audioUri);
            const blob = await response.blob();
            formData.append("audio", blob, "recording.webm");
          } else {
            const uriParts = audioUri.split(".");
            const fileType = uriParts[uriParts.length - 1];
            const audioFile: any = {
              uri: audioUri,
              name: `recording.${fileType}`,
              type: `audio/${fileType}`,
            };
            formData.append("audio", audioFile);
          }

          formData.append("language", "en");

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

          const response = await fetch("https://toolkit.rork.com/stt/transcribe/", {
            method: "POST",
            body: formData,
            signal: controller.signal,
            headers: {
              // Let browser set Content-Type with boundary for FormData
            },
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Voice] Transcription error (attempt ${attempt + 1}):`, {
              status: response.status,
              statusText: response.statusText,
              body: errorText,
            });
            throw new Error(`Transcription failed (${response.status}): ${errorText || response.statusText}`);
          }

          const data = await response.json();
          console.log("[Voice] Transcription result:", data.text);
          return data.text as string;
        } catch (err) {
          console.warn(`[Voice] Attempt ${attempt + 1} failed:`, err);
          lastError = err;
          // Wait before retrying: 500ms, 1000ms, etc.
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
        }
      }
      
      throw lastError;
    },
  });

  const { mutateAsync: transcribeAudio } = transcribeMutation;

  const pushTranscript = useCallback(
    (text: string | null) => {
      if (!text) {
        console.log("[Voice] Empty transcript, skipping");
        return;
      }
      const trimmed = text.trim();
      if (trimmed.length === 0) {
        console.log("[Voice] Empty trimmed transcript, skipping");
        return;
      }
      
      // Clean punctuation for noise detection
      // Removes common punctuation marks to check against noise words
      const cleanText = trimmed.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
      const lowerClean = cleanText.toLowerCase();

      // Filter out very short transcripts that are likely noise (unless they are valid short commands like "make" or "miss" if they somehow got here)
      // But "make" is 4 chars. "3" is 1 char. We should be careful.
      // Let's stick to the noise pattern check mostly.
      if (trimmed.length < 2) { // Reduced from 3 to 2 to allow short numbers if needed, but "make"/"miss" are > 3
         // Check if it's a number?
         if (!/^\d+$/.test(trimmed)) {
            console.log("[Voice] Transcript too short, likely noise:", trimmed);
            return;
         }
      }

      // Filter out common noise patterns
      const noisePatterns = [
        "you", "uh", "um", "ah", "oh", "hm", "mm", 
        "huh", "okay", "ok", "yeah", "yep", "so", "like",
        "well", "right", "just", "see", "actually", "basically",
        "thank you", "thanks", "bye", "hello", "hi", "hey",
        "what", "who", "where", "when", "why", "how",
        "i", "it", "is", "the", "a", "an", "and", "or", "but"
      ];
      
      if (noisePatterns.includes(lowerClean)) {
        console.log("[Voice] Detected noise pattern, skipping:", trimmed);
        return;
      }

      // Filter out incomplete sentences starting with "you" if they are short
      if (lowerClean.startsWith("you ") && lowerClean.length < 10) {
         console.log("[Voice] Detected likely noise phrase, skipping:", trimmed);
         return;
      }
      
      console.log("[Voice] Adding transcript:", trimmed);
      transcriptsRef.current.push(trimmed);
      setLatestTranscript(trimmed);
      const callback = transcriptionCallbackRef.current;
      if (callback) {
        callback(trimmed);
      }
    },
    [],
  );

  const processWebChunks = useCallback(async () => {
    if (webProcessingRef.current) {
      return;
    }
    webProcessingRef.current = true;
    try {
      while (audioChunksRef.current.length > 0) {
        const chunks = audioChunksRef.current.splice(0, audioChunksRef.current.length);
        const chunkBlob = new Blob(chunks, { type: "audio/webm" });
        if (chunkBlob.size === 0) {
          continue;
        }
        const audioUri = URL.createObjectURL(chunkBlob);
        try {
          console.log("[Voice] Processing web chunk...");
          const transcription = await transcribeAudio(audioUri);
          pushTranscript(transcription);
        } catch (err) {
          console.error("[Voice] Web chunk transcription error:", err);
          setError(err instanceof Error ? err.message : "Failed to transcribe audio");
        } finally {
          URL.revokeObjectURL(audioUri);
        }
      }
    } finally {
      webProcessingRef.current = false;
    }
  }, [pushTranscript, transcribeAudio]);

  const runNativeProcessing = useCallback(
    async (shouldRestart: boolean) => {
      const activeRecording = recordingRef.current;
      
      // Clear any existing timeout
      if (chunkTimeoutRef.current) {
        clearTimeout(chunkTimeoutRef.current);
        chunkTimeoutRef.current = null;
      }

      // If no active recording, just restart if needed
      if (!activeRecording) {
        if (shouldRestart && shouldContinueRef.current) {
          try {
            await startNativeChunkRef.current();
          } catch (err) {
            console.error("[Voice] Failed to restart native chunk:", err);
            shouldContinueRef.current = false;
          }
        }
        return;
      }

      // We have an active recording to process
      // 1. Stop the current recording
      let uri: string | null = null;
      try {
        console.log("[Voice] Stopping chunk for processing...");
        await activeRecording.stopAndUnloadAsync();
        uri = activeRecording.getURI();
      } catch (err) {
        console.error("[Voice] Error stopping chunk:", err);
        setError(err instanceof Error ? err.message : "Failed to process recording");
      } finally {
        // Clear the ref immediately so we don't try to stop it again
        if (recordingRef.current === activeRecording) {
            recordingRef.current = null;
        }
      }

      // 2. Restart recording IMMEDIATELY if needed (minimize "deaf" time)
      // We do this BEFORE awaiting transcription
      if (shouldRestart && shouldContinueRef.current) {
        try {
          // startNativeChunk sets recordingRef.current
          await startNativeChunkRef.current(); 
        } catch (err) {
          console.error("[Voice] Failed to restart native chunk:", err);
          shouldContinueRef.current = false;
        }
      }

      // 3. Process the audio in the background (fire and forget)
      if (uri) {
        console.log("[Voice] Transcribing chunk in background:", uri);
        transcribeAudio(uri)
          .then((text) => pushTranscript(text))
          .catch((err) => {
             console.error("[Voice] Native chunk transcription error:", err);
             // We don't set global error here to avoid interrupting the user flow for a single failed chunk
          });
      } else {
        console.warn("[Voice] No URI from recording chunk");
      }
    },
    [pushTranscript, transcribeAudio],
  );

  const processNativeChunk = useCallback(
    (shouldRestart: boolean) => {
      nativeProcessingPromiseRef.current = nativeProcessingPromiseRef.current.then(() =>
        runNativeProcessing(shouldRestart),
      );
      return nativeProcessingPromiseRef.current;
    },
    [runNativeProcessing],
  );

  useEffect(() => {
    processNativeChunkRef.current = processNativeChunk;
  }, [processNativeChunk]);

  const startNativeChunk = useCallback(async () => {
    console.log("[Voice] Starting native chunk...");
    const recording = new Audio.Recording();
    try {
      await recording.prepareToRecordAsync({
        android: {
          extension: ".m4a",
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: ".wav",
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: "audio/webm",
          bitsPerSecond: 128000,
        },
      });
      await recording.startAsync();
      recordingRef.current = recording;
      if (chunkTimeoutRef.current) {
        clearTimeout(chunkTimeoutRef.current);
      }
      chunkTimeoutRef.current = setTimeout(() => {
        if (!shouldContinueRef.current) {
          return;
        }
        void processNativeChunkRef.current(true);
      }, chunkDurationRef.current);
    } catch (err) {
      console.error("[Voice] Error starting native chunk:", err);
      setError(err instanceof Error ? err.message : "Failed to start recording");
      recordingRef.current = null;
      if (chunkTimeoutRef.current) {
        clearTimeout(chunkTimeoutRef.current);
        chunkTimeoutRef.current = null;
      }
      throw err;
    }
  }, []);

  useEffect(() => {
    startNativeChunkRef.current = startNativeChunk;
  }, [startNativeChunk]);

  const startRecording = useCallback(async () => {
    try {
      console.log("[Voice] Starting recording...");
      setError(null);
      setLatestTranscript(null);
      transcriptsRef.current = [];
      shouldContinueRef.current = true;

      if (Platform.OS === "web") {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Microphone access is not supported in this browser");
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (event: MediaRecorderDataEvent) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
            void processWebChunks();
          }
        };
        // Use timeslice for continuous chunking in web
        mediaRecorder.start(1200); // Send data every 1200ms for better audio quality
        setIsRecording(true);
        console.log("[Voice] Web recording started");
      } else {
        const permission = await Audio.requestPermissionsAsync();
        if (!permission.granted) {
          throw new Error("Audio permission not granted");
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        audioModeActiveRef.current = true;
        nativeProcessingPromiseRef.current = Promise.resolve();
        await startNativeChunkRef.current();
        setIsRecording(true);
        console.log("[Voice] Native recording started");
      }
    } catch (err) {
      console.error("[Voice] Error starting recording:", err);
      shouldContinueRef.current = false;
      setIsRecording(false);
      setError(err instanceof Error ? err.message : "Failed to start recording");

      if (Platform.OS !== "web" && audioModeActiveRef.current) {
        audioModeActiveRef.current = false;
        try {
          await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        } catch (audioErr) {
          console.error("[Voice] Error resetting audio mode:", audioErr);
        }
      }

      if (Platform.OS === "web") {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
      }
    }
  }, [processWebChunks]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    console.log("[Voice] Stopping recording...");
    shouldContinueRef.current = false;
    setIsRecording(false);
    setIsProcessing(true);

    try {
      if (Platform.OS === "web") {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== "inactive") {
          await new Promise<void>((resolve, reject) => {
            const handleStop = () => {
              resolve();
            };
            const timeout = setTimeout(() => {
              console.error("[Voice] Timeout stopping web recorder");
              reject(new Error("Timeout stopping recorder"));
            }, 5000);
            recorder.addEventListener("stop", () => {
              clearTimeout(timeout);
              handleStop();
            }, { once: true });
            recorder.stop();
          }).catch((err) => {
            console.error("[Voice] Error in stop promise:", err);
          });
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        await processWebChunks();
      } else {
        if (chunkTimeoutRef.current) {
          clearTimeout(chunkTimeoutRef.current);
          chunkTimeoutRef.current = null;
        }
        await processNativeChunkRef.current(false);
        try {
          // Add timeout for native processing
          const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(() => reject(new Error("Native processing timeout")), 10000);
          });
          await Promise.race([nativeProcessingPromiseRef.current, timeoutPromise]);
        } catch (err) {
          console.error("[Voice] Native processing chain error:", err);
        }
        if (audioModeActiveRef.current) {
          try {
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
          } catch (audioErr) {
            console.error("[Voice] Error resetting audio mode:", audioErr);
          }
          audioModeActiveRef.current = false;
        }
      }
    } catch (err) {
      console.error("[Voice] Error stopping recording:", err);
      setError(err instanceof Error ? err.message : "Failed to process recording");
    } finally {
      if (Platform.OS === "web") {
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
      } else {
        recordingRef.current = null;
      }
      setIsProcessing(false);
    }

    const combinedTranscript =
      transcriptsRef.current.length > 0 ? transcriptsRef.current.join(" ") : null;
    return combinedTranscript;
  }, [processWebChunks]);

  return {
    isRecording,
    isProcessing,
    error,
    latestTranscript,
    startRecording,
    stopRecording,
  };
}
