// Shared ground shape: the mesh builds its vertices from this and every prop
// samples it, so nothing floats above or sinks into the hills. Wavelengths are
// deliberately long — the mesh interpolates linearly between rows, so terrain
// finer than that spacing would leave props hovering over a surface that never
// actually rises to meet them.
const smoothstep = (x: number, min: number, max: number) => {
  const t = Math.min(1, Math.max(0, (x - min) / (max - min)));
  return t * t * (3 - 2 * t);
};

export function groundHeight(x: number, z: number): number {
  const az = Math.abs(z);
  const nearRoad = smoothstep(az, 16, 75); // flat where the asphalt sits
  const farField = 1 - smoothstep(az, 260, 520); // flat once it is fog anyway
  const roll =
    Math.sin(x * 0.0105 + z * 0.0125) * 1.15 + Math.sin(x * 0.0046 - z * 0.0082) * 1.75;
  return nearRoad * farField * roll;
}

export function groundTint(x: number, z: number): number {
  return Math.sin(x * 0.014 + z * 0.017) * 0.5 + Math.sin(x * 0.0031) * 0.5;
}

// Row positions across the depth of the ground: tight where props live and the
// camera can read the relief, stretching out into the fog beyond.
export function groundRows(): number[] {
  const core: number[] = [];
  for (let z = -300; z <= 300; z += 30) core.push(z);
  const tail: number[] = [];
  let z = 300;
  let step = 45;
  while (z < 1800) {
    z = Math.min(1800, z + step);
    tail.push(z);
    step *= 1.5;
  }
  return [...tail.map((v) => -v).reverse(), ...core, ...tail];
}
