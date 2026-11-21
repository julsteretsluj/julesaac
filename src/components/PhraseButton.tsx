import { phraseSymbol } from "../lib/board.ts";
import { phraseInsertion } from "../lib/phraseText.ts";
import type { PageTone } from "../lib/symbols.ts";
import type { Phrase, Phrasing } from "../types.ts";
import { Symbol } from "./Symbol.tsx";

export function PhraseButton({
  phrase,
  phrasing,
  tone,
  onInsert,
  large = false,
}: {
  phrase: Phrase;
  phrasing: Phrasing;
  tone: PageTone;
  onInsert: (phrase: Phrase) => void;
  large?: boolean;
}) {
  const added = phraseInsertion(phrase, phrasing);
  if (!added) return null;
  const label = phrase.label.trim();
  const same = added.toLowerCase() === label.toLowerCase() || added.toLowerCase().startsWith(label.toLowerCase());
  const name = [phrase.favorite ? "Favorite." : "", same ? added : `${label}. ${added}`].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={large ? "cell cell-large" : "cell"}
      data-tone={tone}
      aria-label={name}
      onClick={() => onInsert(phrase)}
    >
      <span className="cell-art">
        {phrase.favorite ? <span className="cell-star" aria-hidden="true">★</span> : null}
        <Symbol id={phraseSymbol(phrase)} label={label} />
      </span>
      <span className="cell-label" aria-hidden="true">
        {label}
      </span>
    </button>
  );
}
