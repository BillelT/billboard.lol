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

// Tap target size around a car's published (x, z) — deliberately much bigger
// than the car itself (roughly half-width 1.25, half-depth 0.6): cars are
// small, fast, and moving, so the box is padded out generously rather than
// hugging the model, or a tap next to the car just misses.
export const CAR_HIT_HALF_X = 2.5;
export const CAR_HIT_HALF_Z = 1.2;
export const CAR_HIT_TOP = 2.5;

// A tap that lands on a car "locks on" for a short window: the car keeps
// driving between taps, so spam-clicking it would otherwise mean re-aiming
// for every single click. Any tap in that window that doesn't land on a
// billboard or a different car keeps bumping the one already locked on,
// wherever exactly it lands.
export const stickyCar: { index: number | null; until: number } = { index: null, until: 0 };
export const STICKY_MS = 0;
