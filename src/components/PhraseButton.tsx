import { phraseButtonLines } from "../lib/phraseText.ts";
import type { Phrase, Phrasing } from "../types.ts";

export function PhraseButton({
  phrase,
  phrasing,
  onInsert,
  large = false,
}: {
  phrase: Phrase;
  phrasing: Phrasing;
  onInsert: (phrase: Phrase) => void;
  large?: boolean;
}) {
  const lines = phraseButtonLines(phrase, phrasing);
  if (!lines.body) return null;

  return (
    <button
      type="button"
      className={large ? "phrase phrase-large" : "phrase"}
      onClick={() => onInsert(phrase)}
    >
      {phrase.favorite ? <span className="flag">Favorite</span> : null}
      {lines.title ? <span className="phrase-title">{lines.title}</span> : null}
      <span className={lines.title ? "phrase-body" : "phrase-title"}>{lines.body}</span>
    </button>
  );
}
