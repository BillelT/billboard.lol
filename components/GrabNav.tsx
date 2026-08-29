"use client";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { bumpClicks } from "@/lib/clicks";
import { debugState } from "@/lib/debugState";
import { interactionState } from "@/lib/interactionState";
import { BILL_Z } from "@/lib/layout";
import { useStore } from "@/lib/store";
import {
  carHitState,
  carClickQueue,
  CAR_HIT_HALF_X,
  CAR_HIT_HALF_Z,
  CAR_HIT_TOP,
  stickyCar,
  STICKY_MS,
} from "@/lib/carState";

// Horizontal drag on the scene = another way to drive down the highway.
// It scrolls the page rather than touching scrollState directly, so the camera
// rig, the scroll hint and the native scrollbar all stay in sync.
const FRICTION = 0.94; // fling decay per frame
const MIN_FLING = 0.05; // px/frame under which the fling stops
const BOX_DEPTH = 3; // how forgiving a click is along the road's depth axis
const CLICK_SLOP = 6; // px of total travel still counted as a tap, not a drag

// The Scene chunk (dynamically imported, see Experience.tsx) already loads
// three — this just grabs a reference to the same module instead of statically
// importing it here, which would otherwise drag the whole library into the
// main page bundle for a feature (tap-to-buy) that's dormant most of the time.
let threeMod: typeof THREE | null = null;
let loading: Promise<void> | null = null;
function ensureThree() {
  if (!threeMod && !loading) {
    loading = import("three").then((m) => {
      threeMod = m;
    });
  }
  return threeMod;
}

// Reused across calls — hover fires this on every pointer move, so this stays
// allocation-free instead of handing the GC a fresh raycaster per pixel.
let raycaster: THREE.Raycaster | null = null;
let hitBox: THREE.Box3 | null = null;
let hitPoint: THREE.Vector3 | null = null;
let ndc: THREE.Vector2 | null = null;

function hitTest(clientX: number, clientY: number) {
  const THREE = ensureThree();
  const camera = interactionState.camera;
  if (!THREE || !camera) return null;
  raycaster ??= new THREE.Raycaster();
  hitBox ??= new THREE.Box3();
  hitPoint ??= new THREE.Vector3();
  ndc ??= new THREE.Vector2();

  ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);

  let best = null as (typeof interactionState.targets)[number] | null;
  let bestDist = Infinity;
  for (const t of interactionState.targets) {
    hitBox.min.set(t.x - t.panelW / 2, t.poleH, BILL_Z - BOX_DEPTH);
    hitBox.max.set(t.x + t.panelW / 2, t.poleH + t.panelH, BILL_Z + BOX_DEPTH);
    const hit = raycaster.ray.intersectBox(hitBox, hitPoint);
    if (!hit) continue;
    const d = camera.position.distanceTo(hit);
    if (d < bestDist) {
      bestDist = d;
      best = t;
    }
  }
  return best;
}

// Same ray-box scan as hitTest above, but against Cars' live per-frame boxes
// instead of the billboards' static ones — a tap picks whichever car is
// nearest the camera among those it actually crosses.
function hitTestCar(clientX: number, clientY: number): number | null {
  const THREE = ensureThree();
  const camera = interactionState.camera;
  if (!THREE || !camera) return null;
  raycaster ??= new THREE.Raycaster();
  hitBox ??= new THREE.Box3();
  hitPoint ??= new THREE.Vector3();
  ndc ??= new THREE.Vector2();

  ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);

  let best: number | null = null;
  let bestDist = Infinity;
  for (const c of carHitState.boxes) {
    if (!c.active) continue;
    hitBox.min.set(c.x - CAR_HIT_HALF_X, 0, c.z - CAR_HIT_HALF_Z);
    hitBox.max.set(c.x + CAR_HIT_HALF_X, CAR_HIT_TOP, c.z + CAR_HIT_HALF_Z);
    const hit = raycaster.ray.intersectBox(hitBox, hitPoint);
    if (!hit) continue;
    const d = camera.position.distanceTo(hit);
    if (d < bestDist) {
      bestDist = d;
      best = c.index;
    }
  }
  return best;
}

export default function GrabNav() {
  const surface = useRef<HTMLDivElement>(null);

  // warm the module so the very first tap doesn't have to wait on it — in
  // practice it's already resolved by the time anything is visible to tap,
  // since the 3D scene itself can't render without it either.
  useEffect(() => {
    ensureThree();
  }, []);

  useEffect(() => {
    const el = surface.current;
    if (!el) return;
    let pointerId: number | null = null;
    let lastX = 0;
    let downX = 0;
    let velocity = 0; // page px per frame
    let raf = 0;
    let moved = false;
    let hoverRaf = 0;
    let hoverX = 0;
    let hoverY = 0;
    let hoveredId: string | null = null;
    let hoveredCar = false;

    const scrollMax = () => document.documentElement.scrollHeight - window.innerHeight;

    // Page pixels per pixel dragged. The page is now exactly as long as the road,
    // so one page pixel is a fixed distance of tarmac whatever the ranking — which
    // means a straight 1:1 with the scroll is both the simplest mapping and the
    // one that keeps a drag feeling the same at 3 billboards and at 200.
    const gain = () => debugState.motion.grab;

    const scrollBy = (d: number) => {
      const next = Math.min(scrollMax(), Math.max(0, window.scrollY + d));
      window.scrollTo(0, next);
      return next;
    };

    const fling = () => {
      velocity *= FRICTION;
      if (Math.abs(velocity) < MIN_FLING) {
        raf = 0;
        return;
      }
      const before = window.scrollY;
      const after = scrollBy(velocity);
      if (after === before) {
        raf = 0;
        return; // hit an end of the road
      }
      raf = requestAnimationFrame(fling);
    };

    // Whatever's under the pointer when it's not dragging: swap the cursor to a
    // pointer and hand the id to interactionState so the billboard itself can
    // light up. Run off rAF rather than every raw pointermove — hover fires far
    // more often than a drag does, and a ray-box loop over every billboard on
    // each of those is wasted work between frames.
    const updateHover = () => {
      hoverRaf = 0;
      const hit = pointerId === null ? hitTest(hoverX, hoverY) : null;
      const id = hit ? hit.id : null;
      const carHit = !hit && pointerId === null ? hitTestCar(hoverX, hoverY) !== null : false;
      if (id === hoveredId && carHit === hoveredCar) return;
      hoveredId = id;
      hoveredCar = carHit;
      interactionState.hovered = id;
      el.classList.toggle("hovering", id !== null || carHit);
    };

    const clearHover = () => {
      cancelAnimationFrame(hoverRaf);
      hoverRaf = 0;
      if (hoveredId === null && !hoveredCar) return;
      hoveredId = null;
      hoveredCar = false;
      interactionState.hovered = null;
      el.classList.remove("hovering");
    };

const onDown = (e: PointerEvent) => {
  if (e.button !== 0 && e.pointerType === "mouse") return;

  // Suppress the browser's native pointerdown default (text/drag selection).
  // Without this, a fast click-spam on a car (which returns below without
  // ever taking pointer capture) can leave the browser mid native
  // selection-drag, which then fights the next real drag gesture and shows
  // a stuck "not-allowed" cursor.
  e.preventDefault();

  // 1. Détection prioritaire : est-ce qu'on clique sur une voiture (ou dans son timer sticky) ?
  const carHit = hitTestCar(e.clientX, e.clientY);
  const now = performance.now();
  const target = carHit ?? (now < stickyCar.until ? stickyCar.index : null);

  if (target !== null) {
    // On enregistre le clic sur la voiture immédiatement
    carClickQueue.push(target);
    stickyCar.index = target;
    stickyCar.until = now + STICKY_MS;
    return; // Fin de la fonction : on n'initialise PAS le drag
  }

  // 2. Si aucune voiture n'est touchée, on démarre le drag (sur la route, l'herbe, etc.)
  pointerId = e.pointerId;
  lastX = e.clientX;
  downX = e.clientX;
  velocity = 0;
  moved = false;
  cancelAnimationFrame(raf);
  raf = 0;
  surface.current?.setPointerCapture(e.pointerId);
  surface.current?.classList.add("grabbing");
  clearHover();
};

    const onMove = (e: PointerEvent) => {
      if (pointerId === null) {
        hoverX = e.clientX;
        hoverY = e.clientY;
        if (!hoverRaf) hoverRaf = requestAnimationFrame(updateHover);
        return;
      }
      if (pointerId !== e.pointerId) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      // Distinguish a real drag from pointer jitter on a click by total travel
      // since pointerdown, not a single move event's delta — a tap can easily
      // produce one 1-2px sub-event on a high-poll-rate mouse or a trackpad,
      // which used to be enough to misclassify the tap as a drag.
      if (Math.abs(e.clientX - downX) > CLICK_SLOP) moved = true;
      // grab the world: pulling left drives forward down the road
      const d = -dx * gain();
      scrollBy(d);
      // weighted towards the latest movement so a fling leaves at the speed the
      // hand was actually going, instead of a averaged-down version of it
      velocity = velocity * 0.35 + d * 0.65;
    };

const onUp = (e: PointerEvent) => {
  if (pointerId !== e.pointerId) return;
  pointerId = null;
  el.releasePointerCapture?.(e.pointerId);
  el.classList.remove("grabbing");

  if (moved && Math.abs(velocity) > MIN_FLING) {
    raf = requestAnimationFrame(fling);
  } else if (!moved) {
    const hit = hitTest(e.clientX, e.clientY);
    if (hit) {
      if (hit.placeholder) {
        useStore.getState().openBuyModal({ rank: hit.rank, amount: hit.amount });
      } else if (hit.url) {
        bumpClicks(hit.id);
        window.open(hit.url, "_blank", "noopener,noreferrer");
      }
    }
  }
};

    // a wheel with a horizontal component (trackpad swipe) is the same gesture as
    // a drag, so it gets the same gain rather than a raw pixel-for-pixel scroll
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      scrollBy(e.deltaX * gain());
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("pointerleave", clearHover);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      clearHover();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerleave", clearHover);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  return <div ref={surface} className="grabzone" aria-hidden />;
}
