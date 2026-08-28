"use client";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { debugState } from "@/lib/debugState";
import { interactionState } from "@/lib/interactionState";
import { BILL_Z } from "@/lib/layout";
import { useStore } from "@/lib/store";

// Horizontal drag on the scene = another way to drive down the highway.
// It scrolls the page rather than touching scrollState directly, so the camera
// rig, the scroll hint and the native scrollbar all stay in sync.
const FRICTION = 0.94; // fling decay per frame
const MIN_FLING = 0.05; // px/frame under which the fling stops
const BOX_DEPTH = 3; // how forgiving a click is along the road's depth axis

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

function hitTest(clientX: number, clientY: number) {
  const THREE = ensureThree();
  const camera = interactionState.camera;
  if (!THREE || !camera) return null;

  const raycaster = new THREE.Raycaster();
  const box = new THREE.Box3();
  const hitPoint = new THREE.Vector3();
  const ndc = new THREE.Vector2(
    (clientX / window.innerWidth) * 2 - 1,
    -(clientY / window.innerHeight) * 2 + 1,
  );
  raycaster.setFromCamera(ndc, camera);

  let best = null as (typeof interactionState.targets)[number] | null;
  let bestDist = Infinity;
  for (const t of interactionState.targets) {
    box.min.set(t.x - t.panelW / 2, 0, BILL_Z - BOX_DEPTH);
    box.max.set(t.x + t.panelW / 2, t.poleH + t.panelH, BILL_Z + BOX_DEPTH);
    const hit = raycaster.ray.intersectBox(box, hitPoint);
    if (!hit) continue;
    const d = camera.position.distanceTo(hit);
    if (d < bestDist) {
      bestDist = d;
      best = t;
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
    let velocity = 0; // page px per frame
    let raf = 0;
    let moved = false;

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

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      pointerId = e.pointerId;
      lastX = e.clientX;
      velocity = 0;
      moved = false;
      cancelAnimationFrame(raf);
      raf = 0;
      el.setPointerCapture(e.pointerId);
      el.classList.add("grabbing");
    };

    const onMove = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      if (Math.abs(dx) > 0.5) moved = true;
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
        if (!hit) return;
        if (hit.placeholder) {
          useStore.getState().openBuyModal({ rank: hit.rank, amount: hit.amount });
        } else if (hit.url) {
          window.open(hit.url, "_blank", "noopener,noreferrer");
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
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  return <div ref={surface} className="grabzone" aria-hidden />;
}
