// Mutable scroll/pointer state written by DOM listeners, read every frame by the
// camera rig — bypasses React re-renders entirely.
export const scrollState = {
  target: 0, // 0..1 page scroll progress
  pointer: { x: 0, y: 0 }, // -1..1 for subtle parallax
  // How long the drive is in world units. The overlay sizes the page from it and
  // the grab surface converts a drag into that same world distance, so a gesture
  // covers the same ground whether the ranking is 3 billboards long or 200.
  roadLength: 1,
};
