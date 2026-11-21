import { symbolPaths } from "../lib/symbols.ts";

export function Symbol({ id, label }: { id: string; label: string }) {
  const paths = symbolPaths(id);
  if (!paths) {
    const letter = label.trim().slice(0, 1).toUpperCase() || "?";
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="symbol">
        <rect x="9" y="9" width="30" height="30" rx="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <text
          x="24"
          y="31"
          textAnchor="middle"
          fontSize="18"
          fontWeight="700"
          fill="currentColor"
          stroke="none"
        >
          {letter}
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="symbol"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}
