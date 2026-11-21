import type { ReactNode } from "react";

export function StatusLine({
  message,
  children,
  live = true,
}: {
  message: string;
  children?: ReactNode;
  live?: boolean;
}) {
  return (
    <div className="status-line" role="status" aria-live={live ? "polite" : "off"} aria-atomic="true">
      <p>{message || "\u00a0"}</p>
      {children}
    </div>
  );
}
