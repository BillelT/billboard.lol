"use client";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { interactionState } from "@/lib/interactionState";
import { BILL_Z } from "@/lib/layout";

const PEAK = 55;
const COLOR = "#fff2d0";

// One shared spotlight that swings onto whichever billboard is under the
// pointer, instead of a light per panel — it only ever needs to be in one
// place at a time. It sits right at the modelled floodlight housings above
// the panel (see the "Floodlights" block in lib/geometry.ts) and aims down
// onto the face, the same look as the night scene's own lamps
// (Night404Lights' LampSpot), so hovering reads as those fixtures switching
// on rather than a mystery glow off the ground. It lights the pole and frame
// the way a real floodlight would (the face itself is unlit and gets its own
// tint, see Billboards.tsx).
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

    // mirrors the floodlight housing placement in makeBillboardGeometry
    const tk = THREE.MathUtils.clamp(t.panelH * 0.07, 0.2, 1.3);
    const fw = Math.max(tk * 0.9, t.panelH * 0.045);
    const u = THREE.MathUtils.clamp(t.panelH * 0.062, 0.2, 1.3);
    const lampY = t.poleH + t.panelH + fw * 0.8 + u * 0.95;
    const lampZ = BILL_Z + tk * 0.9 + u * 1.62;
    const targetY = t.poleH + t.panelH * 0.55;

    l.position.set(t.x, lampY, lampZ);
    l.angle = Math.atan2(t.panelW * 0.55, lampY - targetY);
    l.distance = (lampY - targetY) * 3;
    target.position.set(t.x, targetY, BILL_Z);
  });

  return (
    <>
      <spotLight ref={light} target={target} penumbra={0.5} decay={2} color={COLOR} intensity={0} />
      <primitive object={target} />
    </>
  );
}
