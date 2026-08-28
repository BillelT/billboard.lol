// Closed palette — every 3D color in the scene comes from here (topfloor-like bright daylight).
export const PAL = {
  // sky & atmosphere
  skyTop: "#5fb0ec",
  skyHorizon: "#eaf6ff",
  skyGround: "#d8ecdf",
  fog: "#eaf5ff",
  sun: "#fff3dd",
  hemiSky: "#cfe6fa",
  hemiGround: "#b8d9a2",

  // ground & road
  grass: "#a3d383",
  grassLight: "#b8e098",
  grassDark: "#8fc46f",
  road: "#8e939b",
  roadLine: "#f5f7f4",
  shoulder: "#c8cdb9",

  // vegetation & props
  foliage: "#7dc45e",
  foliageLight: "#97d878",
  trunk: "#9c7350",
  rock: "#c4cbd2",
  bush: "#8ed072",
  pole: "#a98a68",

  // billboard structure
  steel: "#f2f4f6",
  steelDark: "#d7dce1",
  frame: "#ffffff",
  catwalk: "#e3e7ea",

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
