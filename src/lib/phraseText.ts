import type { Phrasing } from "../types.ts";

export function phraseInsertion(
  phrase: { brief: string; full: string },
  phrasing: Phrasing,
): string {
  const brief = phrase.brief.trim();
  const full = phrase.full.trim();
  if (phrasing === "full") return full || brief;
  return brief || full;
}

export function phraseButtonLines(
  phrase: { label: string; brief: string; full: string },
  phrasing: Phrasing,
): { title: string | null; body: string } {
  const body = phraseInsertion(phrase, phrasing);
  const title = phrase.label.trim();
  const bodyKey = body.toLowerCase();
  const titleKey = title.toLowerCase();
  if (!title || titleKey === bodyKey || bodyKey.startsWith(titleKey)) {
    return { title: null, body };
  }
  return { title, body };
}
