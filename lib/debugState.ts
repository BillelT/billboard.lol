// Live tuning values. Defaults here are the shipped look — the debug panel
// (?debug=1) mutates this object in place and the scene reads it. Nothing about
// it reaches users who do not ask for it: the panel is a lazy chunk.

export interface DebugField {
  path: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  type?: "number" | "color" | "select";
  options?: string[];
  /** geometry has to be rebuilt when this changes */
  rebuild?: boolean;
  hint?: string;
}

export const debugState = {
  fog: {
    mode: "linear" as "linear" | "exp2",
    near: 0, // where haze starts, relative to the subject
    far: 2100, // where it tops out — larger is softer, more gradual
    density: 0.0015, // exp2 only
    color: "#e6f3ff",
  },
  light: {
    exposure: 0.82,
    sun: 2.7,
    hemi: 1.05,
    sunAzimuth: 0.16, // radians around Y
    sunElevation: 0.68, // radians above the horizon
  },
  sky: {
    zenith: "#3f9bec",
    horizon: "#e8f5ff",
  },
  terrain: {
    amplitude: 3.5,
    roadFlat: 250, // how far the ground stays flat around the road
    farFade: 1425, // distance over which the relief settles back down
  },
  decor: {
    density: 2.1,
    treeScale: 1.25,
  },
  // A second, position-based fade layered on top of the camera-distance fog:
  // it targets the two ends of the ranking specifically (world x, not distance
  // from the camera), so the pavement/grass/tree line can fade out together
  // right where the world actually ends, instead of relying on distance fog
  // alone — which stays too faint that close in to hide the seam.
  edgeFog: {
    start: 40, // distance past layout.startX/endX where the fade begins
    range: 410, // distance beyond that until fully faded
  },
  camera: {
    fov: 45,
  },
  motion: {
    // How tightly the camera sticks to the scroll. It is a damping rate, not a
    // per-frame lerp: ~1/follow seconds to close the gap, so higher is more 1:1.
    follow: 12,
    // Page pixels of scroll per world unit of road. Sets how much of the drive
    // one wheel tick buys — lower means the scene answers a small scroll.
    scrollPerUnit: 2,
    // Page pixels of scroll per pixel dragged. 1 makes a drag exactly as strong
    // as a scroll of the same distance, which is the whole point: the two ways
    // of driving should not feel like different gears.
    grab: 0.5,
  },
};

export type DebugState = typeof debugState;

export const SUN_DISTANCE = 130;

/** Sun position from its azimuth/elevation, so the light and the panel agree. */
export function sunPosition(): [number, number, number] {
  const { sunAzimuth: a, sunElevation: e } = debugState.light;
  const r = SUN_DISTANCE;
  return [r * Math.cos(e) * Math.sin(a), r * Math.sin(e), r * Math.cos(e) * Math.cos(a)];
}

export const DEBUG_GROUPS: { group: string; fields: DebugField[] }[] = [
  {
    group: "Fog",
    fields: [
      { path: "fog.mode", label: "mode", type: "select", options: ["linear", "exp2"] },
      {
        path: "fog.near",
        label: "start",
        min: 0,
        max: 800,
        step: 5,
        hint: "distance where haze begins — lower brings it closer",
      },
      {
        path: "fog.far",
        label: "full at",
        min: 200,
        max: 4000,
        step: 25,
        hint: "distance where it saturates — higher is softer and more gradual",
      },
      { path: "fog.density", label: "density (exp2)", min: 0, max: 0.006, step: 0.0001 },
      { path: "fog.color", label: "color", type: "color" },
    ],
  },
  {
    group: "Light",
    fields: [
      { path: "light.exposure", label: "exposure", min: 0.3, max: 2.5, step: 0.01 },
      { path: "light.sun", label: "sun", min: 0, max: 5, step: 0.05 },
      { path: "light.hemi", label: "ambient", min: 0, max: 5, step: 0.05 },
      { path: "light.sunAzimuth", label: "sun azimuth", min: -3.14, max: 3.14, step: 0.01 },
      { path: "light.sunElevation", label: "sun height", min: 0.1, max: 1.55, step: 0.01 },
    ],
  },
  {
    group: "Sky",
    fields: [
      { path: "sky.zenith", label: "zenith", type: "color" },
      { path: "sky.horizon", label: "horizon", type: "color" },
    ],
  },
  {
    group: "Terrain",
    fields: [
      { path: "terrain.amplitude", label: "relief", min: 0, max: 4, step: 0.05, rebuild: true },
      { path: "terrain.roadFlat", label: "flat around road", min: 10, max: 300, step: 5, rebuild: true },
      { path: "terrain.farFade", label: "relief fade", min: 150, max: 2000, step: 25, rebuild: true },
    ],
  },
  {
    group: "Decor",
    fields: [
      { path: "decor.density", label: "density", min: 0.2, max: 3, step: 0.1, rebuild: true },
      { path: "decor.treeScale", label: "tree size", min: 0.4, max: 2.5, step: 0.05, rebuild: true },
    ],
  },
  {
    group: "Edge fog",
    fields: [
      {
        path: "edgeFog.start",
        label: "start",
        min: 0,
        max: 800,
        step: 10,
        rebuild: true,
        hint: "distance past each end of the ranking where the fade-out begins",
      },
      {
        path: "edgeFog.range",
        label: "fade length",
        min: 20,
        max: 1200,
        step: 10,
        rebuild: true,
        hint: "distance beyond start until the ground is full fog color and decor has faded out",
      },
    ],
  },
  {
    group: "Camera",
    fields: [{ path: "camera.fov", label: "fov", min: 20, max: 90, step: 1 }],
  },
  {
    group: "Motion",
    fields: [
      {
        path: "motion.follow",
        label: "camera follow",
        min: 1,
        max: 30,
        step: 0.5,
        hint: "how hard the camera tracks the scroll — higher is 1:1, lower floats behind",
      },
      {
        path: "motion.scrollPerUnit",
        label: "scroll length",
        min: 2,
        max: 30,
        step: 0.5,
        rebuild: true,
        hint: "page pixels of scroll per unit of road — lower means less scrolling for the same drive",
      },
      {
        path: "motion.grab",
        label: "grab strength",
        min: 0.2,
        max: 3,
        step: 0.05,
        hint: "drag pull relative to the scroll — 1 makes a drag and a scroll of the same distance identical",
      },
    ],
  },
];

type Bag = Record<string, unknown>;

export function getByPath(path: string): number | string {
  const value = path.split(".").reduce<unknown>((o, k) => (o as Bag)[k], debugState);
  return value as number | string;
}

export function setByPath(path: string, value: number | string): void {
  const keys = path.split(".");
  const last = keys.pop()!;
  const target = keys.reduce<unknown>((o, k) => (o as Bag)[k], debugState) as Bag;
  target[last] = value;
}

// Bumped whenever a value needs geometry rebuilt; components subscribe to it.
let rebuildVersion = 0;
const listeners = new Set<(v: number) => void>();

export function bumpRebuild(): void {
  rebuildVersion += 1;
  listeners.forEach((l) => l(rebuildVersion));
}

export function subscribeRebuild(fn: (v: number) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function debugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("debug");
}
