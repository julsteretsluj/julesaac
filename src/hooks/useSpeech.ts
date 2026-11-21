import { useCallback, useEffect, useRef, useState } from "react";
import { speechSupported, startSpeaking, stopSpeech } from "../lib/speech.ts";
import type { SpeechRate } from "../types.ts";

export interface SpeechControls {
  supported: boolean;
  speaking: boolean;
  voices: SpeechSynthesisVoice[];
  speak: (text: string, handlers: { onEnd: () => void; onError: () => void }) => boolean;
  stop: () => void;
}

export function useSpeech(rate: SpeechRate, voiceURI: string): SpeechControls {
  const [supported] = useState(speechSupported);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const cancelRef = useRef<(() => void) | null>(null);
  const activeRef = useRef(0);

  useEffect(() => {
    if (!supported) return;

    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices();
      setVoices(
        list.slice().sort((a, b) => {
          const aEnglish = a.lang.toLowerCase().startsWith("en") ? 0 : 1;
          const bEnglish = b.lang.toLowerCase().startsWith("en") ? 0 : 1;
          return aEnglish - bEnglish || a.name.localeCompare(b.name);
        }),
      );
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      activeRef.current += 1;
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      stopSpeech();
    };
  }, [supported]);

  const stop = useCallback(() => {
    activeRef.current += 1;
    cancelRef.current?.();
    cancelRef.current = null;
    stopSpeech();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string, handlers: { onEnd: () => void; onError: () => void }) => {
    const token = activeRef.current + 1;
    activeRef.current = token;
    cancelRef.current?.();

    const started = startSpeaking({
      text,
      rate,
      voiceURI,
      onEnd: () => {
        if (activeRef.current !== token) return;
        setSpeaking(false);
        handlers.onEnd();
      },
      onError: (reason) => {
        if (activeRef.current !== token) return;
        setSpeaking(false);
        if (reason === "canceled" || reason === "interrupted") return;
        handlers.onError();
      },
    });

    if (!started) {
      setSpeaking(false);
      return false;
    }

    cancelRef.current = () => {
      if (activeRef.current === token) activeRef.current += 1;
      started.cancel();
    };
    setSpeaking(true);
    return true;
  }, [rate, voiceURI]);

  return { supported, speaking, voices, speak, stop };
}
