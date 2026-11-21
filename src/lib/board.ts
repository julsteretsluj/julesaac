import { sampleCategories, samplePhrases } from "../data/samples.ts";
import { isSymbolId } from "./symbols.ts";
import {
  DATA_VERSION,
  MAX_BRIEF,
  MAX_CATEGORY,
  MAX_DRAFT,
  MAX_FULL,
  MAX_LABEL,
  MAX_RECENTS,
  type BoardData,
  type Category,
  type Phrase,
  type Phrasing,
  type RecentEntry,
  type Settings,
  type SpeechRate,
  type ThemeId,
} from "../types.ts";

export const defaultSettings: Settings = {
  theme: "dark",
  phrasing: "brief",
  overload: false,
  confirmClear: true,
  speechRate: "normal",
  voiceURI: "",
  showIntro: true,
};

const sampleCategoryIds = new Set(sampleCategories.map((category) => category.id));
const samplePhraseIds = new Set(samplePhrases.map((phrase) => phrase.id));

export type BoardAction =
  | { type: "set-draft"; draft: string }
  | { type: "set-theme"; theme: ThemeId }
  | { type: "set-phrasing"; phrasing: Phrasing }
  | { type: "set-overload"; overload: boolean }
  | { type: "set-confirm-clear"; confirmClear: boolean }
  | { type: "set-speech-rate"; speechRate: SpeechRate }
  | { type: "set-voice"; voiceURI: string }
  | { type: "dismiss-intro" }
  | { type: "add-phrase"; phrase: Phrase }
  | { type: "update-phrase"; phrase: Phrase }
  | { type: "delete-phrase"; id: string }
  | { type: "restore-phrase"; phrase: Phrase }
  | { type: "move-phrase"; id: string; direction: -1 | 1 }
  | { type: "add-category"; id: string; name: string }
  | { type: "rename-category"; id: string; name: string }
  | { type: "delete-category"; id: string }
  | { type: "move-category"; id: string; direction: -1 | 1 }
  | { type: "push-recent"; text: string }
  | { type: "import-replace"; incoming: BoardData; applySettings: boolean }
  | { type: "import-merge"; incoming: BoardData; applySettings: boolean }
  | { type: "add-missing-samples" }
  | { type: "reset-sample-wording" };

export function createDefaultBoard(): BoardData {
  const phraseOrders = new Map<string, number>();
  return {
    version: DATA_VERSION,
    categories: sampleCategories.map((category, order) => ({
      id: category.id,
      name: category.name,
      sample: true,
      order,
    })),
    phrases: samplePhrases.map((phrase) => {
      const order = phraseOrders.get(phrase.categoryId) ?? 0;
      phraseOrders.set(phrase.categoryId, order + 1);
      return phraseFromSample(phrase, order);
    }),
    recents: [],
    draft: "",
    settings: { ...defaultSettings },
  };
}

function normalizeSymbol(value: unknown): string {
  return typeof value === "string" && isSymbolId(value) ? value : "";
}

function phraseFromSample(phrase: (typeof samplePhrases)[number], order: number): Phrase {
  return {
    id: phrase.id,
    categoryId: phrase.categoryId,
    label: phrase.label,
    brief: phrase.brief,
    full: phrase.full,
    symbol: normalizeSymbol(phrase.symbol),
    sample: true,
    favorite: false,
    calm: phrase.calm,
    order,
  };
}

export function phraseSymbol(phrase: { id: string; symbol?: string }): string {
  if (typeof phrase.symbol === "string") return normalizeSymbol(phrase.symbol);
  const sample = samplePhrases.find((item) => item.id === phrase.id);
  return sample ? normalizeSymbol(sample.symbol) : "";
}

function clip(value: string, max: number): string {
  return value.trim().slice(0, max);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readTheme(value: unknown): ThemeId {
  return value === "dark" || value === "soft" || value === "light" ? value : defaultSettings.theme;
}

function readPhrasing(value: unknown): Phrasing {
  return value === "brief" || value === "full" ? value : defaultSettings.phrasing;
}

function readRate(value: unknown): SpeechRate {
  return value === "slower" || value === "normal" || value === "faster"
    ? value
    : defaultSettings.speechRate;
}

function reindexPhrases(phrases: Phrase[]): Phrase[] {
  const groups = new Map<string, Phrase[]>();
  for (const phrase of phrases) {
    const list = groups.get(phrase.categoryId) ?? [];
    list.push(phrase);
    groups.set(phrase.categoryId, list);
  }
  const next: Phrase[] = [];
  for (const list of groups.values()) {
    list.sort((a, b) => a.order - b.order);
    list.forEach((phrase, order) => next.push({ ...phrase, order }));
  }
  return next;
}

function reindexCategories(categories: Category[]): Category[] {
  return categories
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((category, order) => ({ ...category, order }));
}

function categoryNameTaken(categories: Category[], name: string, exceptId?: string): boolean {
  const key = name.trim().toLowerCase();
  return categories.some(
    (category) => category.id !== exceptId && category.name.trim().toLowerCase() === key,
  );
}

function movePhrase(state: BoardData, id: string, direction: -1 | 1): BoardData {
  const current = state.phrases.find((phrase) => phrase.id === id);
  if (!current) return state;
  const siblings = state.phrases
    .filter((phrase) => phrase.categoryId === current.categoryId)
    .sort((a, b) => a.order - b.order);
  const index = siblings.findIndex((phrase) => phrase.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= siblings.length) return state;
  const nextSiblings = siblings.slice();
  const [moved] = nextSiblings.splice(index, 1);
  if (!moved) return state;
  nextSiblings.splice(target, 0, moved);
  const order = new Map(nextSiblings.map((phrase, phraseIndex) => [phrase.id, phraseIndex]));
  return {
    ...state,
    phrases: state.phrases.map((phrase) => {
      const nextOrder = order.get(phrase.id);
      return nextOrder === undefined ? phrase : { ...phrase, order: nextOrder };
    }),
  };
}

function moveCategory(state: BoardData, id: string, direction: -1 | 1): BoardData {
  const sorted = state.categories.slice().sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((category) => category.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= sorted.length) return state;
  const next = sorted.slice();
  const [moved] = next.splice(index, 1);
  if (!moved) return state;
  next.splice(target, 0, moved);
  return { ...state, categories: next.map((category, order) => ({ ...category, order })) };
}

function restorePhrase(state: BoardData, phrase: Phrase): BoardData {
  if (state.phrases.some((item) => item.id === phrase.id)) return state;
  if (!state.categories.some((category) => category.id === phrase.categoryId)) return state;
  const others = state.phrases.filter((item) => item.categoryId !== phrase.categoryId);
  const siblings = state.phrases
    .filter((item) => item.categoryId === phrase.categoryId)
    .sort((a, b) => a.order - b.order);
  const index = Math.max(0, Math.min(phrase.order, siblings.length));
  const nextSiblings = siblings.slice();
  nextSiblings.splice(index, 0, phrase);
  const reindexed = nextSiblings.map((item, order) => ({ ...item, order }));
  return { ...state, phrases: [...others, ...reindexed] };
}

export function withMissingSamples(state: BoardData): BoardData {
  const categories = state.categories.slice();
  const categoryIds = new Set(categories.map((category) => category.id));
  for (const sample of sampleCategories) {
    if (categoryIds.has(sample.id)) continue;
    categories.push({
      id: sample.id,
      name: sample.name,
      sample: true,
      order: categories.length,
    });
    categoryIds.add(sample.id);
  }

  const phrases = state.phrases.slice();
  const phraseIds = new Set(phrases.map((phrase) => phrase.id));
  for (const sample of samplePhrases) {
    if (phraseIds.has(sample.id) || !categoryIds.has(sample.categoryId)) continue;
    const order = phrases.filter((phrase) => phrase.categoryId === sample.categoryId).length;
    phrases.push(phraseFromSample(sample, order));
    phraseIds.add(sample.id);
  }

  return {
    ...state,
    categories: reindexCategories(categories),
    phrases: reindexPhrases(phrases),
  };
}

export function withResetSampleWording(state: BoardData): BoardData {
  const samples = new Map(samplePhrases.map((phrase) => [phrase.id, phrase]));
  return {
    ...state,
    phrases: state.phrases.map((phrase) => {
      const sample = samples.get(phrase.id);
      if (!sample) return phrase;
      return {
        ...phrase,
        label: sample.label,
        brief: sample.brief,
        full: sample.full,
        symbol: normalizeSymbol(sample.symbol),
        sample: true,
      };
    }),
  };
}

export function mergeVocabulary(state: BoardData, incoming: BoardData): BoardData {
  const categories = state.categories.slice();
  const categoryIds = new Set(categories.map((category) => category.id));
  for (const category of incoming.categories) {
    if (categoryIds.has(category.id)) continue;
    categories.push({ ...category, order: categories.length });
    categoryIds.add(category.id);
  }

  const phrases = state.phrases.slice();
  const phraseIds = new Set(phrases.map((phrase) => phrase.id));
  for (const phrase of incoming.phrases) {
    if (phraseIds.has(phrase.id) || !categoryIds.has(phrase.categoryId)) continue;
    const order = phrases.filter((item) => item.categoryId === phrase.categoryId).length;
    phrases.push({ ...phrase, order });
    phraseIds.add(phrase.id);
  }

  return {
    ...state,
    categories: reindexCategories(categories),
    phrases: reindexPhrases(phrases),
  };
}

export function sanitizeBoard(value: unknown): BoardData | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.categories) || !Array.isArray(value.phrases)) return null;

  const categories: Category[] = [];
  const seenCategories = new Set<string>();
  value.categories.forEach((entry, index) => {
    if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.name !== "string") return;
    const id = entry.id.trim().slice(0, 80);
    const name = clip(entry.name, MAX_CATEGORY);
    if (!id || !name || seenCategories.has(id)) return;
    seenCategories.add(id);
    categories.push({
      id,
      name,
      sample: sampleCategoryIds.has(id) || entry.sample === true,
      order: typeof entry.order === "number" && Number.isFinite(entry.order) ? entry.order : index,
    });
  });

  const categoryIds = new Set(categories.map((category) => category.id));
  const phrases: Phrase[] = [];
  const seenPhrases = new Set<string>();
  value.phrases.forEach((entry, index) => {
    if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.categoryId !== "string") return;
    const id = entry.id.trim().slice(0, 80);
    const categoryId = entry.categoryId.trim();
    if (!id || seenPhrases.has(id) || !categoryIds.has(categoryId)) return;
    const label = typeof entry.label === "string" ? clip(entry.label, MAX_LABEL) : "";
    let brief = typeof entry.brief === "string" ? clip(entry.brief, MAX_BRIEF) : "";
    let full = typeof entry.full === "string" ? clip(entry.full, MAX_FULL) : "";
    const sampleSymbol = samplePhrases.find((phrase) => phrase.id === id)?.symbol;
    const symbol =
      typeof entry.symbol === "string" ? normalizeSymbol(entry.symbol) : normalizeSymbol(sampleSymbol);
    if (!brief && full) brief = full;
    if (!full && brief) full = "";
    if (!label || !brief) return;
    seenPhrases.add(id);
    phrases.push({
      id,
      categoryId,
      label,
      brief,
      full,
      symbol,
      sample: samplePhraseIds.has(id) || entry.sample === true,
      favorite: entry.favorite === true,
      calm: entry.calm === true,
      order: typeof entry.order === "number" && Number.isFinite(entry.order) ? entry.order : index,
    });
  });

  const settingsRecord = isRecord(value.settings) ? value.settings : {};
  const settings: Settings = {
    theme: readTheme(settingsRecord.theme),
    phrasing: readPhrasing(settingsRecord.phrasing),
    overload: settingsRecord.overload === true,
    confirmClear: settingsRecord.confirmClear !== false,
    speechRate: readRate(settingsRecord.speechRate),
    voiceURI: typeof settingsRecord.voiceURI === "string" ? settingsRecord.voiceURI.slice(0, 300) : "",
    showIntro: settingsRecord.showIntro === true,
  };

  const recents: RecentEntry[] = [];
  if (Array.isArray(value.recents)) {
    for (const entry of value.recents) {
      if (!isRecord(entry) || typeof entry.text !== "string") continue;
      const text = entry.text.trim().slice(0, MAX_DRAFT);
      if (!text || recents.some((item) => item.text === text)) continue;
      recents.push({
        id: typeof entry.id === "string" && entry.id.trim() ? entry.id.slice(0, 80) : `recent-${recents.length}`,
        text,
        at: typeof entry.at === "number" && Number.isFinite(entry.at) ? entry.at : 0,
      });
      if (recents.length >= MAX_RECENTS) break;
    }
  }

  const draft = typeof value.draft === "string" ? value.draft.slice(0, MAX_DRAFT) : "";

  return {
    version: DATA_VERSION,
    categories: reindexCategories(categories),
    phrases: reindexPhrases(phrases),
    recents,
    draft,
    settings,
  };
}

export function reduceBoard(state: BoardData, action: BoardAction): BoardData {
  switch (action.type) {
    case "set-draft":
      return { ...state, draft: action.draft.slice(0, MAX_DRAFT) };
    case "set-theme":
      return { ...state, settings: { ...state.settings, theme: action.theme } };
    case "set-phrasing":
      return { ...state, settings: { ...state.settings, phrasing: action.phrasing } };
    case "set-overload":
      return { ...state, settings: { ...state.settings, overload: action.overload } };
    case "set-confirm-clear":
      return { ...state, settings: { ...state.settings, confirmClear: action.confirmClear } };
    case "set-speech-rate":
      return { ...state, settings: { ...state.settings, speechRate: action.speechRate } };
    case "set-voice":
      return {
        ...state,
        settings: { ...state.settings, voiceURI: action.voiceURI.slice(0, 300) },
      };
    case "dismiss-intro":
      return { ...state, settings: { ...state.settings, showIntro: false } };
    case "add-phrase": {
      if (state.phrases.some((phrase) => phrase.id === action.phrase.id)) return state;
      if (!state.categories.some((category) => category.id === action.phrase.categoryId)) return state;
      const order = state.phrases.filter((phrase) => phrase.categoryId === action.phrase.categoryId).length;
      return {
        ...state,
        phrases: reindexPhrases([
          ...state.phrases,
          { ...action.phrase, symbol: normalizeSymbol(action.phrase.symbol), order, sample: false },
        ]),
      };
    }
    case "update-phrase": {
      const existing = state.phrases.find((phrase) => phrase.id === action.phrase.id);
      if (!existing) return state;
      if (!state.categories.some((category) => category.id === action.phrase.categoryId)) return state;
      const order =
        existing.categoryId === action.phrase.categoryId
          ? existing.order
          : state.phrases.filter((phrase) => phrase.categoryId === action.phrase.categoryId).length;
      return {
        ...state,
        phrases: reindexPhrases(
          state.phrases.map((phrase) =>
            phrase.id === action.phrase.id
              ? { ...action.phrase, symbol: normalizeSymbol(action.phrase.symbol), order, sample: existing.sample }
              : phrase,
          ),
        ),
      };
    }
    case "delete-phrase": {
      if (!state.phrases.some((phrase) => phrase.id === action.id)) return state;
      return { ...state, phrases: reindexPhrases(state.phrases.filter((phrase) => phrase.id !== action.id)) };
    }
    case "restore-phrase":
      return restorePhrase(state, action.phrase);
    case "move-phrase":
      return movePhrase(state, action.id, action.direction);
    case "add-category": {
      const name = clip(action.name, MAX_CATEGORY);
      if (!name || categoryNameTaken(state.categories, name)) return state;
      if (state.categories.some((category) => category.id === action.id)) return state;
      return {
        ...state,
        categories: reindexCategories([
          ...state.categories,
          { id: action.id, name, sample: false, order: state.categories.length },
        ]),
      };
    }
    case "rename-category": {
      const name = clip(action.name, MAX_CATEGORY);
      if (!name || categoryNameTaken(state.categories, name, action.id)) return state;
      if (!state.categories.some((category) => category.id === action.id)) return state;
      return {
        ...state,
        categories: state.categories.map((category) =>
          category.id === action.id ? { ...category, name } : category,
        ),
      };
    }
    case "delete-category": {
      const category = state.categories.find((item) => item.id === action.id);
      if (!category || category.sample) return state;
      if (state.phrases.some((phrase) => phrase.categoryId === action.id)) return state;
      return {
        ...state,
        categories: reindexCategories(state.categories.filter((item) => item.id !== action.id)),
      };
    }
    case "move-category":
      return moveCategory(state, action.id, action.direction);
    case "push-recent": {
      const text = action.text.trim().slice(0, MAX_DRAFT);
      if (!text) return state;
      const recents: RecentEntry[] = [
        { id: `recent-${Date.now()}`, text, at: Date.now() },
        ...state.recents.filter((entry) => entry.text !== text),
      ].slice(0, MAX_RECENTS);
      return { ...state, recents };
    }
    case "import-replace":
      return {
        ...state,
        categories: action.incoming.categories,
        phrases: action.incoming.phrases,
        recents: action.incoming.recents,
        settings: action.applySettings ? action.incoming.settings : state.settings,
      };
    case "import-merge":
      return action.applySettings
        ? { ...mergeVocabulary(state, action.incoming), settings: action.incoming.settings }
        : mergeVocabulary(state, action.incoming);
    case "add-missing-samples":
      return withMissingSamples(state);
    case "reset-sample-wording":
      return withResetSampleWording(state);
    default: {
      const unreachable: never = action;
      void unreachable;
      return state;
    }
  }
}

export function countNewPhrases(state: BoardData, incoming: BoardData): number {
  const ids = new Set(state.phrases.map((phrase) => phrase.id));
  return incoming.phrases.filter((phrase) => !ids.has(phrase.id)).length;
}
