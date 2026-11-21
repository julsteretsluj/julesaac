import { createDefaultBoard, sanitizeBoard } from "./board.ts";
import {
  STORAGE_KEY,
  UNREADABLE_KEY,
  type BackupFile,
  type BoardData,
} from "../types.ts";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LoadResult {
  board: BoardData;
  warning: string | null;
  unreadableRaw: string | null;
}

const UNREADABLE_WARNING =
  "Saved data couldn't be read. A copy was kept in this browser, and the sample board is showing.";

export function loadBoard(store: KeyValueStore = localStorage): LoadResult {
  const raw = store.getItem(STORAGE_KEY);
  if (raw == null || raw === "") {
    return { board: createDefaultBoard(), warning: null, unreadableRaw: null };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const source = unwrap(parsed);
    const board = sanitizeBoard(source);
    if (!board) {
      return { board: createDefaultBoard(), warning: UNREADABLE_WARNING, unreadableRaw: raw };
    }
    return { board, warning: newerWarning(source), unreadableRaw: null };
  } catch {
    return { board: createDefaultBoard(), warning: UNREADABLE_WARNING, unreadableRaw: raw };
  }
}

export function saveBoard(board: BoardData, store: KeyValueStore = localStorage): string | null {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(board));
    return null;
  } catch {
    return "Couldn't save on this device. Export a backup so this board isn't lost.";
  }
}

export function keepUnreadable(raw: string, store: KeyValueStore = localStorage): void {
  try {
    store.setItem(UNREADABLE_KEY, raw);
  } catch {
    // The on-screen warning still says the sample board is showing.
  }
}

export function buildBackup(board: BoardData, now = new Date()): BackupFile {
  return {
    app: "jules-aac",
    exportedAt: now.toISOString(),
    data: board,
  };
}

export function backupFilename(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `aac-backup-${year}-${month}-${day}.json`;
}

export function parseBackup(
  value: unknown,
): { ok: true; board: BoardData; warning: string | null } | { ok: false; error: string } {
  if (!isRecord(value)) return { ok: false, error: "That file isn't an AAC backup." };
  if ("app" in value && value.app !== "jules-aac") {
    return { ok: false, error: "That file isn't an AAC backup." };
  }

  const source = unwrap(value);
  const board = sanitizeBoard(source);
  if (!board) return { ok: false, error: "That file isn't an AAC backup." };
  return { ok: true, board, warning: newerWarning(source) };
}

function unwrap(value: unknown): unknown {
  if (!isRecord(value)) return value;
  if (value.app === "jules-aac" && isRecord(value.data)) return value.data;
  return value;
}

function newerWarning(source: unknown): string | null {
  if (!isRecord(source) || typeof source.version !== "number" || source.version <= 1) return null;
  return "This backup was made by a newer version. Anything it didn't recognize was left out.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
