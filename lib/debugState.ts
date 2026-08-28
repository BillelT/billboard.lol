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
    near: 80, // where haze starts, relative to the subject
    far: 1500, // where it tops out — larger is softer, more gradual
    density: 0.0015, // exp2 only
    color: "#eaf5ff",
  },
  light: {
    exposure: 0.69,
    sun: 2,
    hemi: 1.4,
    sunAzimuth: 0, // radians around Y
    sunElevation: 0.62, // radians above the horizon
  },
  sky: {
    zenith: "#5fb0ec",
    horizon: "#eaf6ff",
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
  camera: {
    fov: 45,
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
    group: "Camera",
    fields: [{ path: "camera.fov", label: "fov", min: 20, max: 90, step: 1 }],
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
