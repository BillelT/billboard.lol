"use client";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { interactionState } from "@/lib/interactionState";
import { BILL_Z } from "@/lib/layout";

const PEAK = 55;
const COLOR = "#fff2d0";

// One shared ground spotlight that swings onto whichever billboard is under
// the pointer, instead of a light per panel — it only ever needs to be in one
// place at a time, and it lights the pole and frame the way a real billboard's
// own floodlight would (the face itself is unlit and gets its own tint, see
// Billboards.tsx).
export default function HoverSpot() {
  const light = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const level = useRef(0);

  useFrame((_, dt) => {
    const l = light.current;
    if (!l) return;

    const id = interactionState.hovered;
    const t = id ? interactionState.targets.find((x) => x.id === id) : null;
    level.current = THREE.MathUtils.damp(level.current, t ? 1 : 0, 7, dt);
    l.intensity = level.current * level.current * PEAK;
    if (!t) return;

    l.position.set(t.x, 0.6, BILL_Z + t.panelH * 0.8);
    l.angle = Math.atan2(t.panelH * 0.75, t.panelH * 0.85);
    l.distance = t.poleH + t.panelH * 2.5;
    target.position.set(t.x, t.poleH + t.panelH * 0.5, BILL_Z);
  });

  return (
    <>
      <spotLight ref={light} target={target} penumbra={0.5} decay={2} color={COLOR} intensity={0} />
      <primitive object={target} />
    </>
  );
}
