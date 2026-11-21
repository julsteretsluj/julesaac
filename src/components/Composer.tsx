import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { SpeechControls } from "../hooks/useSpeech.ts";
import { MAX_DRAFT } from "../types.ts";
import { useBoard } from "../state/BoardContext.tsx";
import { StatusLine } from "./StatusLine.tsx";

export function Composer({
  variant,
  status,
  onStatus,
  live = true,
  speech,
  onSpeak,
  onStop,
  onCopy,
  onShowLarge,
}: {
  variant: "default" | "overload";
  status: string;
  onStatus: (message: string) => void;
  live?: boolean;
  speech: SpeechControls;
  onSpeak: () => void;
  onStop: () => void;
  onCopy: () => void;
  onShowLarge: () => void;
}) {
  const { board, bindTextarea, noteCaret, replaceDraft, dispatch } = useBoard();
  const [confirmText, setConfirmText] = useState<string | null>(null);
  const [undo, setUndo] = useState<string | null>(null);
  const [trackedDraft, setTrackedDraft] = useState(board.draft);
  const { phrasing, confirmClear } = board.settings;

  if (board.draft !== trackedDraft) {
    setTrackedDraft(board.draft);
    if (board.draft !== "" && undo != null) setUndo(null);
    if (confirmText != null && confirmText !== board.draft) setConfirmText(null);
  }

  const armed = confirmText != null && confirmText === board.draft && board.draft !== "";

  useEffect(() => {
    if (!armed) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setConfirmText(null);
      onStatus("Kept the message.");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [armed, onStatus]);

  function remember(target: HTMLTextAreaElement) {
    noteCaret(target.selectionStart ?? 0, target.selectionEnd ?? 0);
  }

  function commitClear() {
    const previous = board.draft;
    speech.stop();
    replaceDraft("", 0);
    setUndo(previous);
    setConfirmText(null);
    onStatus("Message cleared.");
  }

  function requestClear() {
    if (!board.draft) {
      onStatus("The message is already empty.");
      return;
    }
    speech.stop();
    if (confirmClear) {
      setConfirmText(board.draft);
      onStatus("Choose Clear it or Keep the message.");
      return;
    }
    commitClear();
  }

  function onTextKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape" && armed) {
      event.preventDefault();
      setConfirmText(null);
      onStatus("Kept the message.");
    }
  }

  const hint =
    "This chooses the words the next button adds. The message already written stays as it is.";

  return (
    <section className={variant === "overload" ? "composer-wrap composer-static" : "composer-wrap"} aria-labelledby="message-heading">
      <div className="composer">
        <h2 id="message-heading">Message</h2>
        <textarea
          id="message"
          ref={bindTextarea}
          className={variant === "overload" ? "composer-input composer-input-large" : "composer-input"}
          value={board.draft}
          maxLength={MAX_DRAFT}
          placeholder="Type here, or tap a button below."
          aria-labelledby="message-heading"
          autoCapitalize="sentences"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => {
            remember(event.currentTarget);
            dispatch({ type: "set-draft", draft: event.target.value });
          }}
          onSelect={(event) => remember(event.currentTarget)}
          onKeyUp={(event) => remember(event.currentTarget)}
          onClick={(event) => remember(event.currentTarget)}
          onBlur={(event) => remember(event.currentTarget)}
          onKeyDown={onTextKeyDown}
        />
        {board.draft.length >= 4500 ? (
          <p className="help">
            {board.draft.length.toLocaleString()} of {MAX_DRAFT.toLocaleString()} characters.
          </p>
        ) : null}

        <div className="segmented" role="group" aria-label="Phrase length" aria-describedby="phrasing-hint">
          <button
            type="button"
            aria-pressed={phrasing === "brief"}
            onClick={() => dispatch({ type: "set-phrasing", phrasing: "brief" })}
          >
            Direct and brief
          </button>
          <button
            type="button"
            aria-pressed={phrasing === "full"}
            onClick={() => dispatch({ type: "set-phrasing", phrasing: "full" })}
          >
            Full context
          </button>
        </div>
        <p id="phrasing-hint" className="help">
          {hint}
        </p>

        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={onSpeak}>
            Speak
          </button>
          <button type="button" className="btn" onClick={onStop} disabled={!speech.speaking}>
            Stop speaking
          </button>
          <button type="button" className="btn" onClick={onShowLarge}>
            Show large
          </button>
          <button type="button" className="btn" onClick={onCopy}>
            Copy
          </button>
          {armed ? (
            <>
              <button type="button" className="btn btn-danger" onClick={commitClear}>
                Clear it
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setConfirmText(null);
                  onStatus("Kept the message.");
                }}
              >
                Keep the message
              </button>
            </>
          ) : (
            <button type="button" className="btn" onClick={requestClear}>
              Clear
            </button>
          )}
        </div>

        {!speech.supported ? (
          <p className="help">This browser has no speech playback. Show large and Copy still work.</p>
        ) : null}

        <StatusLine message={status} live={live}>
          {undo != null && board.draft === "" ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                replaceDraft(undo, undo.length);
                setUndo(null);
                onStatus("Message restored.");
              }}
            >
              Undo clear
            </button>
          ) : null}
        </StatusLine>
      </div>
    </section>
  );
}
