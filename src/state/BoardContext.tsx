import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import { reduceBoard, type BoardAction } from "../lib/board.ts";
import { insertText } from "../lib/insertText.ts";
import { keepUnreadable, loadBoard, saveBoard } from "../lib/storage.ts";
import { MAX_DRAFT, type BoardData } from "../types.ts";

interface BoardContextValue {
  board: BoardData;
  loadWarning: string | null;
  saveWarning: string | null;
  dismissLoadWarning: () => void;
  dispatch: Dispatch<BoardAction>;
  bindTextarea: (node: HTMLTextAreaElement | null) => void;
  noteCaret: (start: number, end: number) => void;
  insertAtCaret: (text: string) => "ok" | "limit";
  replaceDraft: (draft: string, caret: number) => void;
}

const BoardContext = createContext<BoardContextValue | null>(null);

export function BoardProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(loadBoard);
  const [board, dispatch] = useReducer(reduceBoard, loaded.board);
  const [loadWarning, setLoadWarning] = useState(loaded.warning);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const draftRef = useRef(loaded.board.draft);
  const caretRef = useRef({ start: loaded.board.draft.length, end: loaded.board.draft.length });
  const caretTouchedRef = useRef(false);
  const pendingCaretRef = useRef<number | null>(null);
  const unreadableRef = useRef(loaded.unreadableRaw);
  const boardRef = useRef(board);

  useEffect(() => {
    if (unreadableRef.current) keepUnreadable(unreadableRef.current);
  }, []);

  useEffect(() => {
    setSaveWarning(saveBoard(board));
  }, [board]);

  useEffect(() => {
    const onHide = () => {
      saveBoard(boardRef.current);
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = board.settings.theme;
    const color =
      board.settings.theme === "light" ? "#e6e6eb" : board.settings.theme === "soft" ? "#2a2724" : "#161618";
    document.documentElement.style.background = color;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
  }, [board.settings.theme]);

  useLayoutEffect(() => {
    boardRef.current = board;
    draftRef.current = board.draft;
    const node = textareaRef.current;
    const caret = pendingCaretRef.current;
    if (!node || caret == null) return;
    pendingCaretRef.current = null;
    const wasFocused = document.activeElement === node;
    node.setSelectionRange(caret, caret);
    if (!wasFocused && document.activeElement === node) node.blur();
  }, [board]);

  const bindTextarea = useCallback((node: HTMLTextAreaElement | null) => {
    textareaRef.current = node;
  }, []);

  const noteCaret = useCallback((start: number, end: number) => {
    caretRef.current = { start, end };
    caretTouchedRef.current = true;
  }, []);

  const replaceDraft = useCallback((draft: string, caret: number) => {
    const next = draft.slice(0, MAX_DRAFT);
    const pos = Math.max(0, Math.min(caret, next.length));
    caretRef.current = { start: pos, end: pos };
    caretTouchedRef.current = true;
    pendingCaretRef.current = pos;
    dispatch({ type: "set-draft", draft: next });
  }, []);

  const insertAtCaret = useCallback((text: string): "ok" | "limit" => {
    const draft = draftRef.current;
    const node = textareaRef.current;
    let start = draft.length;
    let end = draft.length;
    if (node && document.activeElement === node) {
      start = node.selectionStart ?? draft.length;
      end = node.selectionEnd ?? draft.length;
    } else if (caretTouchedRef.current) {
      start = caretRef.current.start;
      end = caretRef.current.end;
    }
    const result = insertText(draft, start, end, text);
    if (result.value.length > MAX_DRAFT) return "limit";
    caretRef.current = { start: result.cursor, end: result.cursor };
    caretTouchedRef.current = true;
    pendingCaretRef.current = result.cursor;
    dispatch({ type: "set-draft", draft: result.value });
    return "ok";
  }, []);

  const dismissLoadWarning = useCallback(() => setLoadWarning(null), []);

  const value = useMemo<BoardContextValue>(
    () => ({
      board,
      loadWarning,
      saveWarning,
      dismissLoadWarning,
      dispatch,
      bindTextarea,
      noteCaret,
      insertAtCaret,
      replaceDraft,
    }),
    [
      board,
      loadWarning,
      saveWarning,
      dismissLoadWarning,
      bindTextarea,
      noteCaret,
      insertAtCaret,
      replaceDraft,
    ],
  );

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoard(): BoardContextValue {
  const value = useContext(BoardContext);
  if (!value) throw new Error("useBoard must be used inside BoardProvider");
  return value;
}
