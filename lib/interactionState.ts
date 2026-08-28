import type * as THREE from "three";

export interface ClickTarget {
  rank: number;
  amount: number;
  x: number;
  panelW: number;
  panelH: number;
  poleH: number;
}

// A tiny hand-off between the R3F canvas and the DOM-level GrabNav: the canvas
// is pointer-events:none (GrabNav owns the whole viewport for drag-to-scroll),
// so a tap can't reach react-three-fiber's own raycasting. CameraRig publishes
// the live camera here every frame, Billboards publishes the clickable
// (placeholder-only) slots whenever the layout changes, and GrabNav reads both
// to hit-test a tap without ever touching the canvas's own event system.
export const interactionState: {
  camera: THREE.Camera | null;
  targets: ClickTarget[];
} = {
  camera: null,
  targets: [],
};
