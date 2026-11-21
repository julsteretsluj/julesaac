import { phraseInsertion } from "../lib/phraseText.ts";
import { pageTone } from "../lib/symbols.ts";
import { useBoard } from "../state/BoardContext.tsx";
import type { Phrase } from "../types.ts";
import { PhraseButton } from "./PhraseButton.tsx";

export function CalmBoard({ onNotice }: { onNotice: (message: string) => void }) {
  const { board, insertAtCaret, dispatch } = useBoard();
  const categories = board.categories.slice().sort((a, b) => a.order - b.order);
  const groups = categories
    .map((category) => ({
      category,
      phrases: board.phrases
        .filter((phrase) => phrase.calm && phrase.categoryId === category.id)
        .sort((a, b) => a.order - b.order),
    }))
    .filter((group) => group.phrases.length > 0);

  function onInsert(phrase: Phrase) {
    const result = insertAtCaret(phraseInsertion(phrase, board.settings.phrasing));
    onNotice(result === "limit" ? "This message is at the 5,000 character limit." : "");
  }

  return (
    <section className="board" aria-labelledby="buttons">
      <h2 id="buttons">Buttons for right now</h2>
      <p className="help">Status, boundaries, and a few body needs. Leave calm mode to see the full board.</p>
      {groups.length === 0 ? (
        <p className="help">
          No buttons are marked for calm mode. Leave calm mode, open Editing this board, and turn on “In calm
          mode” for the buttons you want here.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.category.id} className="calm-group">
            <h3>{group.category.name}</h3>
            <ul className="phrase-grid phrase-grid-calm">
              {group.phrases.map((phrase) => (
                <li key={phrase.id}>
                  <PhraseButton
                    phrase={phrase}
                    phrasing={board.settings.phrasing}
                    tone={pageTone(phrase.categoryId, group.category.order)}
                    onInsert={onInsert}
                    large
                  />
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
      <button
        type="button"
        className="btn"
        onClick={() => dispatch({ type: "set-overload", overload: false })}
      >
        Leave calm mode
      </button>
    </section>
  );
}
