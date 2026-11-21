export const DATA_VERSION = 1;
export const STORAGE_KEY = "julesaac.v1";
export const UNREADABLE_KEY = "julesaac.v1.unreadable";
export const MAX_DRAFT = 5000;
export const MAX_RECENTS = 6;
export const MAX_LABEL = 80;
export const MAX_BRIEF = 600;
export const MAX_FULL = 900;
export const MAX_CATEGORY = 40;

export type ThemeId = "dark" | "soft" | "light";
export type Phrasing = "brief" | "full";
export type SpeechRate = "slower" | "normal" | "faster";

export interface Category {
  id: string;
  name: string;
  sample: boolean;
  order: number;
}

export interface Phrase {
  id: string;
  categoryId: string;
  label: string;
  brief: string;
  full: string;
  symbol: string;
  sample: boolean;
  favorite: boolean;
  calm: boolean;
  order: number;
}

export interface RecentEntry {
  id: string;
  text: string;
  at: number;
}

export interface Settings {
  theme: ThemeId;
  phrasing: Phrasing;
  overload: boolean;
  confirmClear: boolean;
  speechRate: SpeechRate;
  voiceURI: string;
  showIntro: boolean;
}

export interface BoardData {
  version: typeof DATA_VERSION;
  categories: Category[];
  phrases: Phrase[];
  recents: RecentEntry[];
  draft: string;
  settings: Settings;
}

export interface BackupFile {
  app: "jules-aac";
  exportedAt: string;
  data: BoardData;
}

export interface SampleCategory {
  id: string;
  name: string;
}

export interface SamplePhrase {
  id: string;
  categoryId: string;
  label: string;
  brief: string;
  full: string;
  symbol: string;
  calm: boolean;
}
