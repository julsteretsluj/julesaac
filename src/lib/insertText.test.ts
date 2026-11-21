import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { insertText } from "./insertText.ts";
import { phraseButtonLines, phraseInsertion } from "./phraseText.ts";

describe("insertText", () => {
  it("inserts into an empty message", () => {
    assert.deepEqual(insertText("", 0, 0, "Yes."), { value: "Yes.", cursor: 4 });
  });

  it("appends with a single space", () => {
    assert.deepEqual(insertText("Hello", 5, 5, "Yes."), {
      value: "Hello Yes.",
      cursor: 10,
    });
  });

  it("does not double an existing space", () => {
    assert.deepEqual(insertText("Hello ", 6, 6, " Yes."), {
      value: "Hello Yes.",
      cursor: 10,
    });
  });

  it("inserts before existing text and leaves the caret on the new phrase", () => {
    const result = insertText("Hello", 0, 0, "Yes.");
    assert.equal(result.value, "Yes. Hello");
    assert.equal(result.cursor, 4);
  });

  it("replaces a selection", () => {
    assert.deepEqual(insertText("Hello there", 6, 11, "friend."), {
      value: "Hello friend.",
      cursor: 13,
    });
  });

  it("keeps the following word separated when inserting in the middle", () => {
    const result = insertText("Please today", 7, 7, "I need quiet.");
    assert.equal(result.value, "Please I need quiet. today");
    assert.equal(result.cursor, "Please I need quiet.".length);
  });

  it("ignores an empty addition", () => {
    assert.deepEqual(insertText("Hello", 2, 2, "   "), { value: "Hello", cursor: 2 });
  });
});

describe("phrase text", () => {
  const phrase = {
    label: "Hungry",
    brief: "I'm hungry.",
    full: "I'm hungry and I need to eat.",
  };

  it("uses the brief line, then the full line", () => {
    assert.equal(phraseInsertion(phrase, "brief"), "I'm hungry.");
    assert.equal(phraseInsertion(phrase, "full"), "I'm hungry and I need to eat.");
  });

  it("falls back when one line is empty", () => {
    assert.equal(phraseInsertion({ brief: "", full: "Full line." }, "brief"), "Full line.");
    assert.equal(phraseInsertion({ brief: "Brief line.", full: "" }, "full"), "Brief line.");
  });

  it("shows a short title only when it differs from the inserted words", () => {
    assert.deepEqual(phraseButtonLines(phrase, "brief"), {
      title: "Hungry",
      body: "I'm hungry.",
    });
    assert.deepEqual(
      phraseButtonLines({ label: "Yes", brief: "Yes.", full: "Yes. That works for me." }, "brief"),
      { title: null, body: "Yes." },
    );
  });
});
