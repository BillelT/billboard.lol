// Shared ground shape: the mesh builds its vertices from this, and every prop
// samples it so nothing floats above or sinks into the hills.
const smoothstep = (x: number, min: number, max: number) => {
  const t = Math.min(1, Math.max(0, (x - min) / (max - min)));
  return t * t * (3 - 2 * t);
};

export function groundHeight(x: number, z: number): number {
  const away = smoothstep(Math.abs(z), 20, 90);
  const roll = Math.sin(x * 0.045 + z * 0.06) + Math.sin(x * 0.013 - z * 0.021) * 1.6;
  return away * roll * 1.15 - 0.02;
}

export function groundTint(x: number, z: number): number {
  return Math.sin(x * 0.021 + z * 0.033) * 0.5 + Math.sin(x * 0.0043) * 0.5;
}
