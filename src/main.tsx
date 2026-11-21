import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BoardProvider } from "./state/BoardContext.tsx";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BoardProvider>
      <App />
    </BoardProvider>
  </StrictMode>,
);
