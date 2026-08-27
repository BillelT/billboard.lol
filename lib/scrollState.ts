// Mutable scroll/pointer state written by DOM listeners, read every frame by the
// camera rig — bypasses React re-renders entirely.
export const scrollState = {
  target: 0, // 0..1 page scroll progress
  pointer: { x: 0, y: 0 }, // -1..1 for subtle parallax
};
