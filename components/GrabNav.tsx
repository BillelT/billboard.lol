"use client";
import { useEffect, useRef } from "react";

// Horizontal drag on the scene = another way to drive down the highway.
// It scrolls the page rather than touching scrollState directly, so the camera
// rig, the scroll hint and the native scrollbar all stay in sync.
const DRAG_TO_SCROLL = 1.6; // page pixels scrolled per pixel dragged
const FRICTION = 0.94; // fling decay per frame
const MIN_FLING = 0.05; // px/frame under which the fling stops

export default function GrabNav() {
  const surface = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = surface.current;
    if (!el) return;
    let pointerId: number | null = null;
    let lastX = 0;
    let velocity = 0; // page px per frame
    let raf = 0;
    let moved = false;

    const scrollMax = () => document.documentElement.scrollHeight - window.innerHeight;
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
      const d = -dx * DRAG_TO_SCROLL;
      scrollBy(d);
      velocity = velocity * 0.6 + d * 0.4;
    };

    const onUp = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      pointerId = null;
      el.releasePointerCapture?.(e.pointerId);
      el.classList.remove("grabbing");
      if (moved && Math.abs(velocity) > MIN_FLING) raf = requestAnimationFrame(fling);
    };

    // a wheel with a horizontal component (trackpad swipe) drives too
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      scrollBy(e.deltaX);
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
