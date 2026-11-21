import { useMemo, useState, type KeyboardEvent } from "react";
import { categoryIntro } from "../data/samples.ts";
import { phraseInsertion } from "../lib/phraseText.ts";
import { pageTone } from "../lib/symbols.ts";
import { useBoard } from "../state/BoardContext.tsx";
import type { Phrase } from "../types.ts";
import { EditBoard } from "./EditBoard.tsx";
import { PhraseButton } from "./PhraseButton.tsx";
import { StatusLine } from "./StatusLine.tsx";
import { Symbol } from "./Symbol.tsx";

type BoardMode = "use" | "edit";

export function BoardSection() {
  const { board, insertAtCaret } = useBoard();
  const [mode, setMode] = useState<BoardMode>("use");
  const [selected, setSelected] = useState("status");
  const [notice, setNotice] = useState("");

  const categories = useMemo(
    () => board.categories.slice().sort((a, b) => a.order - b.order),
    [board.categories],
  );
  const tabs = useMemo(
    () => [...categories.map((category) => ({ id: category.id, name: category.name })), { id: "favorites", name: "Favorites" }],
    [categories],
  );
  const active = tabs.some((tab) => tab.id === selected) ? selected : (tabs[0]?.id ?? "favorites");
  const phrases = useMemo(() => {
    const list =
      active === "favorites"
        ? board.phrases.filter((phrase) => phrase.favorite)
        : board.phrases.filter((phrase) => phrase.categoryId === active);
    return list.slice().sort((a, b) => a.order - b.order);
  }, [active, board.phrases]);

  function onInsert(phrase: Phrase) {
    const result = insertAtCaret(phraseInsertion(phrase, board.settings.phrasing));
    setNotice(result === "limit" ? "This message is at the 5,000 character limit." : "");
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const key = event.key;
    if (key !== "ArrowRight" && key !== "ArrowLeft" && key !== "Home" && key !== "End") return;
    event.preventDefault();
    const index = tabs.findIndex((tab) => tab.id === active);
    let next = index;
    if (key === "ArrowRight") next = (index + 1) % tabs.length;
    if (key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    if (key === "Home") next = 0;
    if (key === "End") next = tabs.length - 1;
    const tab = tabs[next];
    if (!tab) return;
    setSelected(tab.id);
    document.getElementById(`tab-${tab.id}`)?.focus();
  }

  function onRecent(text: string) {
    const result = insertAtCaret(text);
    setNotice(result === "limit" ? "This message is at the 5,000 character limit." : "");
  }

  return (
    <section className="board" aria-labelledby="buttons">
      <div className="board-heading">
        <h2 id="buttons">Buttons</h2>
        <div className="segmented" role="group" aria-label="Board mode">
          <button type="button" aria-pressed={mode === "use"} onClick={() => setMode("use")}>
            Using buttons
          </button>
          <button type="button" aria-pressed={mode === "edit"} onClick={() => setMode("edit")}>
            Editing this board
          </button>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Button categories" onKeyDown={onTabKeyDown}>
        {tabs.map((tab) => {
          const selectedTab = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              className="tab"
              aria-selected={selectedTab}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selectedTab ? 0 : -1}
              onClick={() => setSelected(tab.id)}
            >
              {tab.name}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`} className="panel">
        <p className="help">{categoryIntro(active)}</p>
        {mode === "edit" ? (
          <EditBoard categories={categories} phrases={phrases} active={active} />
        ) : phrases.length === 0 ? (
          <p className="help">
            {active === "favorites"
              ? "No favorites yet. Switch to Editing this board, then mark any button as a favorite."
              : "No buttons in this category yet. Switch to Editing this board to add one."}
          </p>
        ) : (
          <ul className="phrase-grid">
            {phrases.map((phrase) => (
              <li key={phrase.id}>
                <PhraseButton
                  phrase={phrase}
                  phrasing={board.settings.phrasing}
                  tone={pageTone(phrase.categoryId, categories.find((category) => category.id === phrase.categoryId)?.order ?? 0)}
                  onInsert={onInsert}
                />
              </li>
            ))}
          </ul>
        )}
        <StatusLine message={notice} />
      </div>

      {mode === "use" ? (
        <div className="recents">
          <h2>Recent messages</h2>
          {board.recents.length === 0 ? (
            <p className="help">After you speak, show, or copy a message, it is listed here so you can use it again.</p>
          ) : (
            <ul className="phrase-grid">
              {board.recents.map((entry) => (
                <li key={entry.id}>
                  <button type="button" className="cell" data-tone="yellow" aria-label={entry.text} onClick={() => onRecent(entry.text)}>
                    <span className="cell-art">
                      <Symbol id="message" label="" />
                    </span>
                    <span className="cell-label" aria-hidden="true">
                      {entry.text}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
