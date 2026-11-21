export interface VoiceInfo {
  voiceURI: string;
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
}

const NOVELTY = new Set([
  "albert",
  "bad news",
  "bahh",
  "bells",
  "boing",
  "bubbles",
  "cellos",
  "deranged",
  "fred",
  "good news",
  "hysterical",
  "jester",
  "junior",
  "kathy",
  "organ",
  "pipe organ",
  "princess",
  "ralph",
  "superstar",
  "trinoids",
  "whisper",
  "wobble",
  "zarvox",
]);

const PREFERRED: Record<string, number> = {
  samantha: 100,
  alex: 96,
  ava: 94,
  allison: 92,
  susan: 90,
  zoe: 88,
  evan: 86,
  nathan: 84,
  tom: 82,
  nicky: 80,
  daniel: 78,
  karen: 76,
  moira: 74,
  serena: 72,
  tessa: 70,
  "google us english": 68,
  "google uk english female": 66,
  "google uk english male": 64,
};

function baseName(name: string): string {
  return name.toLowerCase().split("(")[0].trim();
}

export function isNoveltyVoice(name: string): boolean {
  return NOVELTY.has(baseName(name));
}

export function isSpeakableVoice(voice: VoiceInfo): boolean {
  return voice.lang.toLowerCase().startsWith("en") && !isNoveltyVoice(voice.name);
}

export function scoreVoice(voice: VoiceInfo): number {
  if (!isSpeakableVoice(voice)) return -1;
  let score = PREFERRED[baseName(voice.name)] ?? 10;
  if (voice.localService) score += 25;
  if (/premium|enhanced/i.test(voice.name)) score += 20;
  if (/compact/i.test(voice.name)) score -= 15;
  const lang = voice.lang.toLowerCase();
  if (lang.startsWith("en-us")) score += 12;
  else if (lang.startsWith("en-gb")) score += 8;
  else score += 4;
  if (voice.default) score += 2;
  return score;
}

export function pickSpeakingVoice<T extends VoiceInfo>(voices: readonly T[], voiceURI: string): T | null {
  if (voiceURI) {
    const chosen = voices.find((voice) => voice.voiceURI === voiceURI && isSpeakableVoice(voice));
    if (chosen) return chosen;
  }
  let best: T | null = null;
  let bestScore = -1;
  for (const voice of voices) {
    const score = scoreVoice(voice);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

export function listSpeakingVoices<T extends VoiceInfo>(voices: readonly T[]): T[] {
  return voices
    .filter(isSpeakableVoice)
    .sort((a, b) => a.name.localeCompare(b.name) || a.lang.localeCompare(b.lang));
}
