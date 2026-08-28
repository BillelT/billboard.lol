// Same hand-off as interactionState: GrabNav lives outside the canvas
// (pointer-events:none) and can't reach react-three-fiber's own raycasting, so
// Cars publishes each instance's live world box here every frame — car
// positions move continuously, unlike the static billboards — and GrabNav
// hit-tests taps against them, queuing the index of whatever was tapped for
// Cars to drain on its next frame. `active` goes false while a car is hidden
// after exploding, so a tap can't land on it mid-respawn.
export interface CarBox {
  index: number;
  x: number;
  z: number;
  active: boolean;
}

export const carHitState: { boxes: CarBox[] } = { boxes: [] };
export const carClickQueue: number[] = [];

// Tap target size around a car's published (x, z) — generous enough to catch
// a car mid-bump without dragging in the road's neighbouring lane.
export const CAR_HIT_HALF_X = 1.7;
export const CAR_HIT_HALF_Z = 1.05;
export const CAR_HIT_TOP = 3;
