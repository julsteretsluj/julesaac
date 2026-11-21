export const symbolChoices = [
  { id: "yes", name: "Yes" },
  { id: "no", name: "No" },
  { id: "maybe", name: "Not sure" },
  { id: "stop", name: "Stop" },
  { id: "enough", name: "Enough" },
  { id: "wait", name: "Wait" },
  { id: "minute", name: "A minute" },
  { id: "slow", name: "Slow" },
  { id: "agree", name: "Agree" },
  { id: "disagree", name: "Disagree" },
  { id: "thanks", name: "Thank you" },
  { id: "okay", name: "Okay" },
  { id: "calm", name: "Person" },
  { id: "mute", name: "Can't talk" },
  { id: "quiet", name: "Quiet" },
  { id: "listen", name: "Listening" },
  { id: "type", name: "Typing" },
  { id: "space", name: "Space" },
  { id: "support", name: "Support" },
  { id: "break", name: "Break" },
  { id: "leave", name: "Leave" },
  { id: "no-touch", name: "Don't touch" },
  { id: "food", name: "Food" },
  { id: "drink", name: "Drink" },
  { id: "bathroom", name: "Bathroom" },
  { id: "hot", name: "Hot" },
  { id: "cold", name: "Cold" },
  { id: "pressure", name: "Pressure" },
  { id: "pain", name: "Pain" },
  { id: "tired", name: "Tired" },
  { id: "overwhelm", name: "Too much" },
  { id: "headache", name: "Headache" },
  { id: "sit", name: "Sit" },
  { id: "literal", name: "Direct" },
  { id: "schedule", name: "Schedule" },
  { id: "more", name: "More" },
  { id: "unfair", name: "Unfair" },
  { id: "repeat", name: "Repeat" },
  { id: "short", name: "Short" },
  { id: "writing", name: "Writing" },
  { id: "one", name: "One" },
  { id: "message", name: "Message" },
] as const;

export type SymbolId = (typeof symbolChoices)[number]["id"];

const symbolIds = new Set<string>(symbolChoices.map((choice) => choice.id));

export function isSymbolId(value: string): value is SymbolId {
  return symbolIds.has(value);
}

export function symbolName(id: string): string {
  return symbolChoices.find((choice) => choice.id === id)?.name ?? "Letter";
}

const shapes: Record<SymbolId, string[]> = {
  yes: ["M11 25l9 10L38 14"],
  no: ["M14 14l20 20", "M34 14L14 34"],
  maybe: ["M20 16a6 6 0 1 1 2 11v5", "M22 38h.1"],
  stop: ["M16 8h16l8 8v16l-8 8H16l-8-8V16z", "M18 24h12"],
  enough: ["M18 28V14", "M23 26V11", "M28 26V14", "M33 28v-6c1-4 5-3 5 2v8c0 8-5 12-12 12h-2c-7 0-12-4-12-12v-6"],
  wait: ["M24 8a16 16 0 1 0 .1 0", "M24 14v11l7 4"],
  minute: ["M24 8a16 16 0 1 0 .1 0", "M24 24V14", "M24 24h7"],
  slow: ["M8 32c6-12 26-12 32 0", "M16 32h16", "M24 16v8"],
  agree: ["M24 8a16 16 0 1 0 .1 0", "M15 25l6 6 13-14"],
  disagree: ["M24 8a16 16 0 1 0 .1 0", "M17 17l14 14", "M31 17L17 31"],
  thanks: ["M24 40C12 30 10 22 14 18a6 6 0 0 1 10 1 6 6 0 0 1 10-1c4 4 2 12-10 22z"],
  okay: ["M24 8a16 16 0 1 0 .1 0", "M18 21h.1", "M30 21h.1", "M17 28c2 5 12 5 14 0"],
  calm: ["M24 8a5 5 0 1 0 .1 0", "M12 40c2-12 6-16 12-16s10 4 12 16"],
  mute: ["M8 16h14a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-6l-6 6v-6H8a4 4 0 0 1-4-4v-6a4 4 0 0 1 4-4z", "M30 12L12 38"],
  quiet: ["M8 20h7l9-8v24l-9-8H8z", "M30 19a7 7 0 0 1 0 10"],
  listen: ["M16 12a4 4 0 1 0 .1 0", "M10 34c1-8 3-10 6-10s5 2 6 10", "M30 16a8 8 0 0 1 0 12", "M35 12a13 13 0 0 1 0 20"],
  type: ["M6 16h36v16H6z", "M12 22h3", "M20 22h3", "M28 22h3", "M36 22h.1", "M12 28h18"],
  space: ["M16 14a4 4 0 1 0 .1 0", "M10 36c1-8 3-10 6-10s5 2 6 10", "M32 14v18", "M36 18v10"],
  support: ["M15 14a4 4 0 1 0 .1 0", "M9 36c1-8 3-10 6-10s5 2 6 10", "M33 14a4 4 0 1 0 .1 0", "M27 36c1-8 3-10 6-10s5 2 6 10"],
  break: ["M16 10v28", "M32 10v28"],
  leave: ["M10 10h16v28H10z", "M20 24h.1", "M28 24h12", "M34 18l6 6-6 6"],
  "no-touch": ["M18 24V14", "M24 22V12", "M30 22v-6", "M16 24c0 8 2 12 8 12s8-4 8-12", "M10 38L38 10"],
  food: ["M24 20c-7 0-12 6-12 12 0 5 4 8 8 8h8c4 0 8-3 8-8 0-6-5-12-12-12z", "M24 20c1-6 6-8 10-6"],
  drink: ["M16 12h16l-2 20a6 6 0 0 1-6 5h0a6 6 0 0 1-6-5z", "M18 20h12"],
  bathroom: ["M16 8h16v8H16z", "M14 16h20l-2 8H16z", "M18 24h12v8a6 6 0 0 1-12 0z"],
  hot: ["M24 18a6 6 0 1 0 .1 0", "M24 6v5", "M24 37v5", "M6 24h5", "M37 24h5", "M11 11l4 4", "M33 33l4 4", "M37 11l-4 4", "M15 33l-4 4"],
  cold: ["M24 6v36", "M8 14l32 20", "M8 34l32-20", "M24 24l8-2", "M24 24l-8 2"],
  pressure: ["M8 22h32v10H8z", "M16 14h16v8H16z", "M14 32v6", "M34 32v6"],
  pain: ["M18 12a4 4 0 1 0 .1 0", "M18 18v8", "M12 24l6 3 6-3", "M14 38l4-10 4 10", "M34 10l2 5 5 1-4 3 2 5-5-3-5 3 2-5-4-3 5-1z"],
  tired: ["M8 16h26v16H8z", "M34 21h4v6h-4", "M13 24h8"],
  overwhelm: ["M24 6l4 9 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z"],
  headache: ["M24 22a7 7 0 1 0 .1 0", "M24 8v6", "M11 14l4 4", "M37 14l-4 4", "M8 26h6", "M34 26h6"],
  sit: ["M16 14h16v10H16z", "M16 24v14", "M32 24v14", "M16 28H8v10"],
  literal: ["M10 16h28", "M10 24h28", "M10 32h18"],
  schedule: ["M10 12h28v24H10z", "M10 18h28", "M18 8v8", "M30 8v8"],
  more: ["M8 12h24a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H18l-6 6v-6H8a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z", "M16 22h8", "M20 18v8"],
  unfair: ["M24 8v28", "M14 36h20", "M8 16h32", "M8 16l-5 8h10z", "M40 16l-5 8h10z"],
  repeat: ["M16 18a9 9 0 0 1 14-3l3 3", "M33 12v7h-7", "M32 30a9 9 0 0 1-14 3l-3-3", "M15 36v-7h7"],
  short: ["M16 16h16", "M12 24h24", "M18 32h12"],
  writing: ["M14 8h14l8 8v24H14z", "M28 8v8h8", "M18 24h12", "M18 30h12", "M18 36h8"],
  one: ["M22 14l6-4v24", "M18 34h16"],
  message: ["M8 10h32v20H20l-8 8v-8H8z"],
};

export function symbolPaths(id: string): string[] | null {
  return isSymbolId(id) ? shapes[id] : null;
}

const pageTones = ["yellow", "green", "blue", "orange", "purple", "pink"] as const;
export type PageTone = (typeof pageTones)[number];

const knownTones: Record<string, PageTone> = {
  status: "blue",
  needs: "orange",
  social: "purple",
  mine: "green",
};

export function pageTone(categoryId: string, order = 0): PageTone {
  return knownTones[categoryId] ?? pageTones[((order % pageTones.length) + pageTones.length) % pageTones.length];
}
