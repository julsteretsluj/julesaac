import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listSpeakingVoices, pickSpeakingVoice, type VoiceInfo } from "./voices.ts";

function voice(partial: VoiceInfo): VoiceInfo {
  return partial;
}

const macVoices: VoiceInfo[] = [
  voice({ voiceURI: "zarvox", name: "Zarvox", lang: "en-US", localService: true }),
  voice({ voiceURI: "albert", name: "Albert", lang: "en-US", localService: true }),
  voice({ voiceURI: "bad", name: "Bad News", lang: "en-US", localService: true }),
  voice({ voiceURI: "bubbles", name: "Bubbles", lang: "en-US", localService: true }),
  voice({ voiceURI: "samantha", name: "Samantha", lang: "en-US", localService: true }),
  voice({ voiceURI: "samantha-e", name: "Samantha (Enhanced)", lang: "en-US", localService: true }),
  voice({ voiceURI: "alex", name: "Alex", lang: "en-US", localService: true }),
  voice({ voiceURI: "google", name: "Google US English", lang: "en-US", localService: false }),
  voice({ voiceURI: "daniel", name: "Daniel", lang: "en-GB", localService: true }),
  voice({ voiceURI: "eddy", name: "Eddy (English (United Kingdom))", lang: "en-GB", localService: true }),
];

describe("pickSpeakingVoice", () => {
  it("uses a local speaking voice instead of a novelty voice", () => {
    const picked = pickSpeakingVoice(macVoices, "");
    assert.equal(picked?.voiceURI, "samantha-e");
  });

  it("ignores a saved novelty voice", () => {
    const picked = pickSpeakingVoice(macVoices, "zarvox");
    assert.equal(picked?.voiceURI, "samantha-e");
  });

  it("keeps an explicit speaking voice", () => {
    const picked = pickSpeakingVoice(macVoices, "daniel");
    assert.equal(picked?.name, "Daniel");
  });

  it("treats a qualified novelty name as a sound effect", () => {
    const picked = pickSpeakingVoice(
      [voice({ voiceURI: "z", name: "Zarvox (English (United States))", lang: "en-US", localService: true })],
      "",
    );
    assert.equal(picked, null);
  });

  it("leaves sound-effect voices out of the list", () => {
    const names = listSpeakingVoices(macVoices).map((item) => item.name);
    assert.equal(names.includes("Zarvox"), false);
    assert.equal(names.includes("Bad News"), false);
    assert.equal(names.includes("Samantha"), true);
    assert.equal(names.includes("Eddy (English (United Kingdom))"), true);
  });
});
