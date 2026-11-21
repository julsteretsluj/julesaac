import { useEffect, useRef } from "react";
import type { SpeechControls } from "../hooks/useSpeech.ts";

export function FullscreenMessage({
  text,
  speech,
  onSpeak,
  onStop,
  onClose,
  status,
}: {
  text: string;
  speech: SpeechControls;
  onSpeak: () => void;
  onStop: () => void;
  onClose: () => void;
  status: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    textRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (!items.includes(active as HTMLButtonElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fullscreen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fullscreen-title"
      aria-describedby="fullscreen-message"
      ref={dialogRef}
    >
      <h2 id="fullscreen-title" className="visually-hidden">
        Large message
      </h2>
      <p id="fullscreen-message" className="fullscreen-text" tabIndex={-1} ref={textRef}>
        {text}
      </p>
      <p className="help">Hold this screen up. Escape closes it.</p>
      <div className="fullscreen-toolbar">
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
        <button type="button" className="btn btn-primary" onClick={onSpeak}>
          Speak
        </button>
        <button type="button" className="btn" onClick={onStop} disabled={!speech.speaking}>
          Stop speaking
        </button>
      </div>
      <div className="status-line" role="status" aria-live="polite">
        <p>{status || "\u00a0"}</p>
      </div>
    </div>
  );
}
