import { useRef, useState } from "react";
import { countNewPhrases, withMissingSamples } from "../lib/board.ts";
import { downloadJson } from "../lib/clipboard.ts";
import { backupFilename, buildBackup, parseBackup } from "../lib/storage.ts";
import { useBoard } from "../state/BoardContext.tsx";
import type { BoardData, SpeechRate } from "../types.ts";
import { StatusLine } from "./StatusLine.tsx";

const rates: { id: SpeechRate; label: string }[] = [
  { id: "slower", label: "Slower" },
  { id: "normal", label: "Normal" },
  { id: "faster", label: "Faster" },
];

interface SpeechList {
  voiceURI: string;
  name: string;
  lang: string;
}

export function SettingsPanel({
  voices,
  speechSupported,
}: {
  voices: SpeechList[];
  speechSupported: boolean;
}) {
  const { board, dispatch } = useBoard();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [incoming, setIncoming] = useState<BoardData | null>(null);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [applySettings, setApplySettings] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  async function onFile(file: File | undefined) {
    setIncoming(null);
    setImportNote(null);
    setApplySettings(false);
    if (!file) return;
    if (file.size > 2_000_000) {
      setMessage("That file is too large to be a button backup.");
      return;
    }
    try {
      const parsed = parseBackup(JSON.parse(await file.text()));
      if (!parsed.ok) {
        setMessage(parsed.error);
        return;
      }
      setIncoming(parsed.board);
      setImportNote(parsed.warning);
      setMessage("");
    } catch {
      setMessage("Couldn't read that file.");
    }
  }

  function finishImport() {
    setIncoming(null);
    setImportNote(null);
    setApplySettings(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section className="settings" aria-labelledby="settings-heading">
      <h2 id="settings-heading" className="visually-hidden">
        Settings and backup
      </h2>
      <details className="panel-disclosure">
        <summary>
          <span>Settings and backup</span>
          <span className="summary-state">
            <span className="when-closed">Show</span>
            <span className="when-open">Hide</span>
          </span>
        </summary>
        <div className="panel-body">
          <div className="stack">
            <h3>Clearing a message</h3>
            <label className="check">
              <input
                type="checkbox"
                checked={board.settings.confirmClear}
                onChange={(event) =>
                  dispatch({ type: "set-confirm-clear", confirmClear: event.target.checked })
                }
              />
              <span>Ask before clearing. You can still undo a clear from the message box.</span>
            </label>
          </div>

          <div className="stack">
            <h3>Speech</h3>
            {speechSupported ? (
              <>
                <div className="segmented" role="group" aria-label="Speaking speed">
                  {rates.map((rate) => (
                    <button
                      key={rate.id}
                      type="button"
                      aria-pressed={board.settings.speechRate === rate.id}
                      onClick={() => dispatch({ type: "set-speech-rate", speechRate: rate.id })}
                    >
                      {rate.label}
                    </button>
                  ))}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="voice">
                    Voice
                  </label>
                  <select
                    id="voice"
                    value={board.settings.voiceURI}
                    onChange={(event) => dispatch({ type: "set-voice", voiceURI: event.target.value })}
                  >
                    <option value="">Browser default</option>
                    {board.settings.voiceURI &&
                    !voices.some((voice) => voice.voiceURI === board.settings.voiceURI) ? (
                      <option value={board.settings.voiceURI}>Saved voice</option>
                    ) : null}
                    {voices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                  {voices.length === 0 ? (
                    <p className="help">This browser picks the voice. A list appears here if it shares one.</p>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="help">This browser has no speech playback. Show large and Copy still work.</p>
            )}
          </div>

          <div className="stack">
            <h3>Backup</h3>
            <p className="help">
              The file includes your buttons, categories, favorites, recent messages, settings, and the current
              message. It stays on this device until you move the file yourself.
            </p>
            <div className="actions">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  downloadJson(backupFilename(), buildBackup(board));
                  setMessage("Backup downloaded.");
                }}
              >
                Export backup
              </button>
              <button type="button" className="btn" onClick={() => inputRef.current?.click()}>
                Choose a backup file
              </button>
              <input
                ref={inputRef}
                className="visually-hidden"
                type="file"
                accept="application/json,.json"
                tabIndex={-1}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  void onFile(file);
                  event.target.value = "";
                }}
              />
            </div>
            {incoming ? (
              <div className="edit-card">
                <p>
                  This file has {incoming.phrases.length} buttons in {incoming.categories.length} categories.
                </p>
                {importNote ? <p className="help">{importNote}</p> : null}
                <label className="check">
                  <input
                    type="checkbox"
                    checked={applySettings}
                    onChange={(event) => setApplySettings(event.target.checked)}
                  />
                  <span>Also use the theme, speech, and calm mode from this file.</span>
                </label>
                <div className="actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      dispatch({ type: "import-replace", incoming, applySettings });
                      setMessage(
                        applySettings
                          ? "Replaced the buttons and applied the backup's theme, speech, and calm mode. Your current message is still in the box."
                          : "Replaced the buttons, categories, and recent messages. Your current message and settings are still here.",
                      );
                      finishImport();
                    }}
                  >
                    Replace my board
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      const added = countNewPhrases(board, incoming);
                      if (added === 0) {
                        setMessage("Those buttons are already on this board.");
                        finishImport();
                        return;
                      }
                      dispatch({ type: "import-merge", incoming, applySettings });
                      setMessage(
                        `Added ${added} ${added === 1 ? "button" : "buttons"} from the backup.`,
                      );
                      finishImport();
                    }}
                  >
                    Add new buttons
                  </button>
                  <button type="button" className="btn" onClick={finishImport}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="stack">
            <h3>Sample buttons</h3>
            <p className="help">
              Open this page once while online. After that it works offline. Your board is saved in this browser.
            </p>
            <div className="actions">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const added = withMissingSamples(board).phrases.length - board.phrases.length;
                  dispatch({ type: "add-missing-samples" });
                  setMessage(
                    added === 0
                      ? "All sample buttons are already here."
                      : `Put back ${added} sample ${added === 1 ? "button" : "buttons"}. Edited buttons were left as they are.`,
                  );
                }}
              >
                Add missing sample buttons
              </button>
              {confirmRestore ? (
                <>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      dispatch({ type: "reset-sample-wording" });
                      setConfirmRestore(false);
                      setMessage("Sample wording is restored. Custom buttons were left as they are.");
                    }}
                  >
                    Restore sample wording
                  </button>
                  <button type="button" className="btn" onClick={() => setConfirmRestore(false)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" className="btn" onClick={() => setConfirmRestore(true)}>
                  Restore sample wording
                </button>
              )}
            </div>
            {confirmRestore ? (
              <p className="help">This puts the original words back on sample buttons. Custom buttons stay.</p>
            ) : null}
          </div>

          <StatusLine message={message} />
        </div>
      </details>
    </section>
  );
}
