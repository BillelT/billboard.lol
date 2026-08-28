// Night palette for the 404 easter egg. The ground, road and treeline reuse the
// daytime geometry and vertex colors as-is (see NightScene) — only relit — so
// this file holds what's unique to the night: the sky, the moon and stars, and
// the broken sign itself, kept strictly black / yellow / white, no blue.
export const NIGHT = {
  // sky & atmosphere
  skyTop: "#050a18",
  skyHorizon: "#141d38",
  skyGround: "#03040a",
  fog: "#080c1a",
  hemiSky: "#1c2740",
  hemiGround: "#07070c",
  moonLight: "#aab8e6",
  moon: "#f4f1e2",
  star: "#eef2ff",

  // the sign itself
  signInk: "#131316",
  signPanel: "#1c1c20",
  signPanelDark: "#0c0c0f",
  signYellow: "#f2c230",
  signWhite: "#f6f4ea",
  rust: "#4a3a26",
  lampGlow: "#ffdd7a",

  // structure — a weathered, near-monochrome steel instead of the daytime white
  steel: "#2c2e35",
  steelDark: "#1a1b1f",
  frame: "#232429",
  catwalk: "#1c1d21",

  // crow — a shade off pure black so it still reads as a silhouette against
  // the near-black sky, not just a hole in it
  crow: "#26262d",
  crowBeak: "#37373f",

  // spiderweb strands
  web: "rgba(238,241,255,0.5)",
} as const;
