import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createId } from "./ids.ts";
import {
  countNewPhrases,
  createDefaultBoard,
  mergeVocabulary,
  reduceBoard,
  sanitizeBoard,
  withMissingSamples,
  withResetSampleWording,
} from "./board.ts";
import { isSymbolId } from "./symbols.ts";
import { loadBoard, parseBackup, saveBoard, type KeyValueStore } from "./storage.ts";

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { dump: () => Map<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    dump: () => map,
  };
}

describe("default board", () => {
  const board = createDefaultBoard();

  it("includes the core phrases", () => {
    const text = board.phrases.map((phrase) => `${phrase.label} ${phrase.brief} ${phrase.full}`).join("\n");
    for (const snippet of [
      "can't talk out loud",
      "dimmer light",
      "shutdown or meltdown",
      "still processing",
      "support needs are higher",
      "step away",
      "I'm hungry",
      "I'm thirsty",
      "bathroom",
      "I'm too hot",
      "I'm too cold",
      "deep pressure",
      "heavy blanket",
      "hard to explain",
      "battery is low",
      "Yes.",
      "No.",
      "not sure yet",
      "direct and literal",
      "one-on-one",
      "share more details",
      "unfair or confusing",
      "backing me up",
    ]) {
      assert.match(text.toLowerCase(), new RegExp(snippet.toLowerCase()));
    }
  });

  it("gives every sample button a known picture", () => {
    for (const phrase of board.phrases) {
      assert.equal(isSymbolId(phrase.symbol), true, phrase.id);
    }
  });

  it("puts calm mode on a small essential set", () => {
    const calm = board.phrases.filter((phrase) => phrase.calm).map((phrase) => phrase.id);
    assert.deepEqual(calm.sort(), [
      "needs-bathroom",
      "needs-hungry",
      "needs-pain",
      "needs-thirsty",
      "needs-tired",
      "social-no",
      "social-yes",
      "status-break",
      "status-cant-talk",
      "status-processing",
      "status-quiet",
      "status-shutdown",
      "status-support",
    ]);
  });
});

describe("reduceBoard", () => {
  it("moves a phrase within its category and refuses to pass the ends", () => {
    const start = createDefaultBoard();
    const first = start.phrases.find((phrase) => phrase.categoryId === "status" && phrase.order === 0);
    assert.ok(first);
    const stuck = reduceBoard(start, { type: "move-phrase", id: first.id, direction: -1 });
    assert.equal(stuck, start);
    const moved = reduceBoard(start, { type: "move-phrase", id: first.id, direction: 1 });
    const status = moved.phrases
      .filter((phrase) => phrase.categoryId === "status")
      .sort((a, b) => a.order - b.order);
    assert.equal(status[1]?.id, first.id);
  });

  it("adds, edits, reorders, and restores a custom phrase", () => {
    let board = createDefaultBoard();
    const phrase = {
      id: createId("phrase"),
      categoryId: "mine",
      label: "Work exit",
      brief: "I need to leave the meeting.",
      full: "I need to leave the meeting. I will write later.",
      sample: false,
      favorite: false,
      calm: true,
      order: 0,
    };
    board = reduceBoard(board, { type: "add-phrase", phrase });
    assert.equal(board.phrases.some((item) => item.id === phrase.id), true);

    board = reduceBoard(board, {
      type: "update-phrase",
      phrase: { ...phrase, label: "Leave meeting", favorite: true },
    });
    assert.equal(board.phrases.find((item) => item.id === phrase.id)?.label, "Leave meeting");

    const removed = board.phrases.find((item) => item.id === phrase.id);
    assert.ok(removed);
    board = reduceBoard(board, { type: "delete-phrase", id: phrase.id });
    assert.equal(board.phrases.some((item) => item.id === phrase.id), false);
    board = reduceBoard(board, { type: "restore-phrase", phrase: removed });
    assert.equal(board.phrases.find((item) => item.id === phrase.id)?.label, "Leave meeting");
  });

  it("renames and deletes only empty custom categories", () => {
    let board = createDefaultBoard();
    board = reduceBoard(board, { type: "add-category", id: "places", name: "Places" });
    board = reduceBoard(board, { type: "rename-category", id: "places", name: "Rooms" });
    assert.equal(board.categories.find((category) => category.id === "places")?.name, "Rooms");
    const blocked = reduceBoard(board, { type: "delete-category", id: "status" });
    assert.equal(blocked, board);
    board = reduceBoard(board, { type: "delete-category", id: "places" });
    assert.equal(board.categories.some((category) => category.id === "places"), false);
  });

  it("keeps a category that still has buttons", () => {
    let board = createDefaultBoard();
    board = reduceBoard(board, { type: "add-category", id: "places", name: "Places" });
    board = reduceBoard(board, {
      type: "add-phrase",
      phrase: {
        id: "phrase-room",
        categoryId: "places",
        label: "Kitchen",
        brief: "I need the kitchen.",
        full: "",
        sample: false,
        favorite: false,
        calm: false,
        order: 0,
      },
    });
    const next = reduceBoard(board, { type: "delete-category", id: "places" });
    assert.equal(next.categories.some((category) => category.id === "places"), true);
  });

  it("restores missing samples without clobbering edited wording", () => {
    let board = createDefaultBoard();
    const original = board.phrases.find((phrase) => phrase.id === "social-yes");
    assert.ok(original);
    board = reduceBoard(board, {
      type: "update-phrase",
      phrase: { ...original, brief: "Yes please." },
    });
    board = reduceBoard(board, { type: "delete-phrase", id: "needs-hungry" });
    board = withMissingSamples(board);
    assert.equal(board.phrases.find((phrase) => phrase.id === "social-yes")?.brief, "Yes please.");
    assert.equal(board.phrases.some((phrase) => phrase.id === "needs-hungry"), true);
    board = reduceBoard(board, {
      type: "update-phrase",
      phrase: { ...board.phrases.find((phrase) => phrase.id === "social-yes")!, symbol: "" },
    });
    board = withResetSampleWording(board);
    assert.equal(board.phrases.find((phrase) => phrase.id === "social-yes")?.brief, "Yes.");
    assert.equal(board.phrases.find((phrase) => phrase.id === "social-yes")?.symbol, "yes");
  });

  it("merges by id and can replace the vocabulary", () => {
    const current = createDefaultBoard();
    const incoming = createDefaultBoard();
    incoming.phrases = [
      ...incoming.phrases,
      {
        id: "phrase-extra",
        categoryId: "mine",
        label: "Extra",
        brief: "An extra line.",
        full: "",
        sample: false,
        favorite: true,
        calm: false,
        order: 20,
      },
    ];
    const merged = mergeVocabulary(current, incoming);
    assert.equal(countNewPhrases(current, incoming), 1);
    assert.equal(merged.phrases.filter((phrase) => phrase.id === "phrase-extra").length, 1);
    assert.equal(reduceBoard(merged, { type: "import-merge", incoming, applySettings: false }).phrases.length, merged.phrases.length);

    const replaced = reduceBoard(
      { ...current, draft: "Keep me" },
      { type: "import-replace", incoming: merged, applySettings: false },
    );
    assert.equal(replaced.draft, "Keep me");
    assert.equal(replaced.phrases.some((phrase) => phrase.id === "phrase-extra"), true);
  });
});

describe("storage", () => {
  it("round-trips a board and rejects a random file", () => {
    const store = memoryStore();
    const board = reduceBoard(createDefaultBoard(), { type: "set-phrasing", phrasing: "full" });
    assert.equal(saveBoard(board, store), null);
    const loaded = loadBoard(store);
    assert.equal(loaded.warning, null);
    assert.equal(loaded.board.settings.phrasing, "full");
    assert.equal(parseBackup({ app: "other" }).ok, false);
    const backup = parseBackup({ app: "jules-aac", exportedAt: "2026-11-21T00:00:00.000Z", data: board });
    assert.equal(backup.ok, true);
  });

  it("keeps unreadable data available for a manual copy", () => {
    const store = memoryStore({ "julesaac.v1": "{not json" });
    const loaded = loadBoard(store);
    assert.match(loaded.warning ?? "", /couldn't be read/i);
    assert.equal(loaded.unreadableRaw, "{not json");
    assert.ok(loaded.board.phrases.length > 0);
  });

  it("fills a missing sample picture and keeps a chosen placeholder", () => {
    const board = createDefaultBoard();
    const raw = {
      ...board,
      phrases: board.phrases.map((phrase) => {
        if (phrase.id === "social-yes") {
          const { symbol: _symbol, ...rest } = phrase;
          return rest;
        }
        if (phrase.id === "needs-hungry") return { ...phrase, symbol: "" };
        if (phrase.id === "social-no") return { ...phrase, symbol: "not-a-voice" };
        return phrase;
      }),
    };
    const loaded = sanitizeBoard(raw);
    assert.equal(loaded?.phrases.find((phrase) => phrase.id === "social-yes")?.symbol, "yes");
    assert.equal(loaded?.phrases.find((phrase) => phrase.id === "needs-hungry")?.symbol, "");
    assert.equal(loaded?.phrases.find((phrase) => phrase.id === "social-no")?.symbol, "");
  });

  it("drops a phrase that has no words", () => {
    const board = sanitizeBoard({
      categories: [{ id: "mine", name: "My phrases", sample: true, order: 0 }],
      phrases: [{ id: "x", categoryId: "mine", label: " ", brief: " ", full: " " }],
    });
    assert.equal(board?.phrases.length, 0);
  });
});
