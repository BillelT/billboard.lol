"use client";
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

const STEPS = [1, 1.25, 1.5, 1.75];
const SLOW_MS = 22; // below ~45fps
const FAST_MS = 13; // comfortably above 60fps
const WINDOW = 45; // frames per decision
const COOLDOWN = 1.2; // seconds before another change

// Drops resolution when frames get expensive and earns it back when they are
// cheap, so a weak GPU trades sharpness for a smooth camera instead of
// stuttering. The ceiling is the device's own pixel ratio: rendering above it
// would cost fill rate for pixels the screen cannot show.
export default function AdaptiveDpr({ max }: { max: number }) {
  const setDpr = useThree((s) => s.setDpr);

  const levels = useMemo(() => {
    const ceiling = Math.min(max, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
    const usable = STEPS.filter((s) => s <= ceiling + 0.001);
    return usable.length ? usable : [ceiling];
  }, [max]);

  // R3F starts the canvas at that same ceiling, so begin at the top step
  const level = useRef(levels.length - 1);
  const acc = useRef({ ms: 0, n: 0, cooldown: 0 });

  useFrame((_, dt) => {
    const a = acc.current;
    if (a.cooldown > 0) a.cooldown -= dt;
    a.ms += dt * 1000;
    a.n += 1;
    if (a.n < WINDOW) return;

    const avg = a.ms / a.n;
    a.ms = 0;
    a.n = 0;
    if (a.cooldown > 0) return;

    const cur = level.current;
    let next = cur;
    if (avg > SLOW_MS && cur > 0) next = cur - 1;
    else if (avg < FAST_MS && cur < levels.length - 1) next = cur + 1;

    if (next !== cur) {
      level.current = next;
      setDpr(levels[next]);
      a.cooldown = COOLDOWN;
    }
  });

  return null;
}
