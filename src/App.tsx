import { useCallback, useState } from "react";
import { copyText } from "./lib/clipboard.ts";
import { useBoard } from "./state/BoardContext.tsx";
import { useSpeech } from "./hooks/useSpeech.ts";
import { BoardSection } from "./components/BoardSection.tsx";
import { CalmBoard } from "./components/CalmBoard.tsx";
import { Composer } from "./components/Composer.tsx";
import { FullscreenMessage } from "./components/FullscreenMessage.tsx";
import { Header } from "./components/Header.tsx";
import { SettingsPanel } from "./components/SettingsPanel.tsx";

export default function App() {
  const { board, loadWarning, saveWarning, dismissLoadWarning, dispatch } = useBoard();
  const speech = useSpeech(board.settings.speechRate, board.settings.voiceURI);
  const [status, setStatus] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const calm = board.settings.overload;
  const closeFullscreen = useCallback(() => setFullscreen(false), []);

  const remember = useCallback(() => {
    const text = board.draft.trim();
    if (text) dispatch({ type: "push-recent", text });
  }, [board.draft, dispatch]);

  const onSpeak = useCallback(() => {
    const text = board.draft.trim();
    if (!text) {
      setStatus("There's no message to speak yet.");
      return;
    }
    if (!speech.supported) {
      setStatus("This browser has no speech playback. Show large and Copy still work.");
      return;
    }
    const started = speech.speak(text, {
      onEnd: () => setStatus("Finished speaking."),
      onError: () => setStatus("This browser didn't play the message. You can show it large or copy it."),
    });
    if (!started) {
      setStatus("This browser didn't play the message. You can show it large or copy it.");
      return;
    }
    setStatus("Speaking.");
    dispatch({ type: "push-recent", text });
  }, [board.draft, dispatch, speech]);

  const onStop = useCallback(() => {
    speech.stop();
    setStatus("Stopped speaking.");
  }, [speech]);

  async function onCopy() {
    if (!board.draft.trim()) {
      setStatus("There's no message to copy yet.");
      return;
    }
    const ok = await copyText(board.draft);
    if (!ok) {
      setStatus("Couldn't copy from this browser. You can still show the message large.");
      return;
    }
    setStatus("Copied.");
    remember();
  }

  function onShowLarge() {
    if (!board.draft.trim()) {
      setStatus("Write a message first, then you can show it large.");
      return;
    }
    setStatus("Showing the message large.");
    setFullscreen(true);
    remember();
  }

  return (
    <>
      <a className="skip" href="#main">
        Skip to message
      </a>
      <div className="shell" data-calm={calm ? "true" : "false"} {...(fullscreen ? { inert: true } : {})}>
        <Header />
        {loadWarning || saveWarning ? (
          <div className="banner">
            {loadWarning ? <p>{loadWarning}</p> : null}
            {saveWarning ? <p>{saveWarning}</p> : null}
            {loadWarning ? (
              <button type="button" className="btn" onClick={dismissLoadWarning}>
                Dismiss
              </button>
            ) : null}
          </div>
        ) : null}
        {board.settings.showIntro && !calm ? (
          <div className="note">
            <p>
              Type a message, or tap a button to add one. Then speak it, show it large, or copy it. Everything stays
              on this device.
            </p>
            <button type="button" className="btn" onClick={() => dispatch({ type: "dismiss-intro" })}>
              Hide this note
            </button>
          </div>
        ) : null}
        <main id="main">
          <Composer
            variant={calm ? "overload" : "default"}
            status={status}
            onStatus={setStatus}
            live={!fullscreen}
            speech={speech}
            onSpeak={onSpeak}
            onStop={onStop}
            onCopy={() => {
              void onCopy();
            }}
            onShowLarge={onShowLarge}
          />
          {calm ? <CalmBoard onNotice={setStatus} /> : <BoardSection />}
          {calm ? null : <SettingsPanel voices={speech.voices} speechSupported={speech.supported} />}
        </main>
      </div>
      {fullscreen ? (
        <FullscreenMessage
          text={board.draft}
          speech={speech}
          status={status}
          onSpeak={onSpeak}
          onStop={onStop}
          onClose={closeFullscreen}
        />
      ) : null}
    </>
  );
}
