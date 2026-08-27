import { debugState } from "./debugState";

// Shared ground shape: the mesh builds its vertices from this and every prop
// samples it, so nothing floats above or sinks into the hills. Everything here
// is smooth and long-wavelength on purpose — the mesh interpolates linearly
// between rows, so any knee sharper than the row spacing leaves props hovering
// over a surface that never rises to meet them. That is why the falloffs are
// gaussians rather than smoothsteps.
export function groundHeight(x: number, z: number): number {
  const { amplitude, roadFlat, farFade } = debugState.terrain;
  const nearRoad = 1 - Math.exp(-((z / roadFlat) ** 2)); // flat where the asphalt sits
  const farField = Math.exp(-((z / farFade) ** 2)); // settles back down into the fog
  const roll =
    Math.sin(x * 0.0105 + z * 0.0125) * 1.15 + Math.sin(x * 0.0046 - z * 0.0082) * 1.75;
  return nearRoad * farField * roll * amplitude;
}

export function groundTint(x: number, z: number): number {
  return Math.sin(x * 0.014 + z * 0.017) * 0.5 + Math.sin(x * 0.0031) * 0.5;
}

// Row positions across the depth of the ground: tight where props stand and the
// camera reads the relief, stretching out into the fog beyond.
export function groundRows(): number[] {
  const core: number[] = [];
  for (let z = -150; z <= 150; z += 15) core.push(z);
  const mid = [180, 215, 250, 285, 320];
  const tail: number[] = [];
  let z = 320;
  let step = 50;
  while (z < 1800) {
    z = Math.min(1800, z + step);
    tail.push(z);
    step *= 1.5;
  }
  const outward = [...mid, ...tail];
  return [...outward.map((v) => -v).reverse(), ...core, ...outward];
}
