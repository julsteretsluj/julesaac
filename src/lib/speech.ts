import type { SpeechRate } from "../types.ts";
import { pickSpeakingVoice } from "./voices.ts";

const RATES: Record<SpeechRate, number> = {
  slower: 0.82,
  normal: 1,
  faster: 1.12,
};

export function speechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

export function stopSpeech(): void {
  if (!speechSupported()) return;
  window.speechSynthesis.cancel();
}

export function startSpeaking(options: {
  text: string;
  rate: SpeechRate;
  voiceURI: string;
  onEnd: () => void;
  onError: (reason: string) => void;
}): { cancel: () => void } | null {
  if (!speechSupported()) return null;
  const text = options.text.trim();
  if (!text) return null;

  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = RATES[options.rate];
  utterance.pitch = 1;
  utterance.volume = 1;

  const voice = pickSpeakingVoice(synth.getVoices(), options.voiceURI);
  if (voice) {
    utterance.voice = voice;
  } else {
    utterance.lang = "en-US";
  }

  utterance.onend = () => options.onEnd();
  utterance.onerror = (event) => options.onError(event.error);

  try {
    // Canceling while nothing is speaking makes Chrome on Mac drop the pitch
    // of the next phrase, which is the "monster" voice.
    if (synth.speaking || synth.pending) synth.cancel();
    if (synth.paused) synth.resume();
    synth.speak(utterance);
  } catch {
    return null;
  }

  return {
    cancel: () => {
      synth.cancel();
    },
  };
}
