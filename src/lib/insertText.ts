export interface InsertResult {
  value: string;
  cursor: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Insert a phrase at the caret. Adds a separating space when two chunks would
 * otherwise glue together, and leaves the caret at the end of the new phrase
 * so the next tap continues from there.
 */
export function insertText(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  addition: string,
): InsertResult {
  const phrase = addition.trim();
  const start = clamp(selectionStart, 0, value.length);
  const end = clamp(selectionEnd, start, value.length);
  if (!phrase) return { value, cursor: start };

  const before = value.slice(0, start);
  const after = value.slice(end);
  const lead = before.length > 0 && !/\s$/.test(before) ? " " : "";
  const trail = after.length > 0 && !/^\s/.test(after) ? " " : "";
  const next = before + lead + phrase + trail + after;
  return { value: next, cursor: before.length + lead.length + phrase.length };
}
