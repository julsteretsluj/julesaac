import { useBoard } from "../state/BoardContext.tsx";
import type { ThemeId } from "../types.ts";

const themes: { id: ThemeId; label: string }[] = [
  { id: "dark", label: "Dark" },
  { id: "soft", label: "Soft" },
  { id: "light", label: "Light" },
];

export function Header() {
  const { board, dispatch } = useBoard();
  const { theme, overload } = board.settings;

  return (
    <header className="topbar">
      <div>
        <h1>AAC</h1>
        <p className="lede">For times when speaking out loud isn't available.</p>
      </div>
      <div className="top-controls">
        <button
          type="button"
          className="btn"
          aria-pressed={overload}
          onClick={() => dispatch({ type: "set-overload", overload: !overload })}
        >
          Calm mode <span className="btn-state">{overload ? "On" : "Off"}</span>
        </button>
        <div className="segmented" role="group" aria-label="Theme">
          {themes.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={theme === item.id}
              onClick={() => dispatch({ type: "set-theme", theme: item.id })}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
