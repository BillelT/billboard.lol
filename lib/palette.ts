// Closed palette — every 3D color in the scene comes from here (topfloor-like bright daylight).
export const PAL = {
  // sky & atmosphere
  skyTop: "#5e4fe9",
  skyHorizon: "#79d5ff",
  skyGround: "#31f7a4",
  fog: "#ddedfd",
  sun: "#fae2b7",
  hemiSky: "#add5f8",
  hemiGround: "#b8d9a2",

  // ground & road
  grass: "#71c552",
  grassLight: "#8ad566",
  grassDark: "#57ad3f",
  road: "#71777f",
  roadLine: "#fbfcf9",
  shoulder: "#b9c3a6",

  // vegetation & props
  foliage: "#4faa3c",
  foliageLight: "#6cc652",
  foliageDark: "#3d8c2e",
  trunk: "#8a5f3c",
  rock: "#c4cbd2",
  bush: "#5cb443",
  pole: "#8e6b4a",
  wire: "#8d939b",
  grassBlade: "#4fa63a",
  grassBladeLight: "#74c953",

  // billboard structure
  steel: "#f6f4ee",
  steelDark: "#c3c9d0",
  frame: "#fbf9f3",
  catwalk: "#dde2e7",
  lamp: "#41474f",
  lampGlow: "#fff6dd",

  // cars
  carColors: ["#f2b632", "#e4572e", "#3aa6a6", "#f5f5f0", "#5b8cd6"],
  wheel: "#2c2c30",
  window: "#3a4a5a",

  // birds
  bird: "#3d444e",
  birdBeak: "#f2b632",

  // helicopter
  heliBody: "#e4572e",
  heliRoof: "#f7f7f4",
  heliDark: "#4a4f57",
  rotor: "#5b6069",
} as const;

// Brand colors offered for billboards (and used by the seed data)
export const BRAND_COLORS = [
  "#2f6bff",
  "#e4572e",
  "#12b886",
  "#f6a41d",
  "#7048e8",
  "#e64980",
  "#0ca6b8",
  "#37415c",
] as const;

export function brandColorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return BRAND_COLORS[h % BRAND_COLORS.length];
}
