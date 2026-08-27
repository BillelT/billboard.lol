// Live renderer stats, written every frame by <PerfProbe/> inside the Canvas and
// read on an interval by the DOM panel. Only collected when ?perf=1 is set.
export const perfState = {
  enabled: false,
  fps: 0,
  ms: 0,
  calls: 0,
  triangles: 0,
  textures: 0,
  geometries: 0,
  programs: 0,
  dpr: 0,
};

export function perfEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("perf");
}
