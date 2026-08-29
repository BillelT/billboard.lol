"use client";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { interactionState } from "@/lib/interactionState";
import { BILL_Z } from "@/lib/layout";

const PEAK = 26; // per fixture — three of these together read like the old single 55
const COLOR = "#fff2d0";
const MAX_LAMPS = 3; // matches the most fixtures makeBillboardGeometry ever models

// mirrors the floodlight housing x-offsets in makeBillboardGeometry's
// "Floodlights" block: 3 across a wide panel, 2 on a narrow one
function lampOffsets(panelW: number): number[] {
  if (panelW < 7.5) return [-0.24 * panelW, 0.24 * panelW];
  return [-0.3 * panelW, 0, 0.3 * panelW];
}

// One shared set of spotlights (up to MAX_LAMPS) that swings onto whichever
// billboard is under the pointer, instead of a set per panel — only one
// billboard is ever hovered at a time. Each sits at one of the modelled
// floodlight housings above the panel (see the "Floodlights" block in
// lib/geometry.ts) and aims down onto the face, the same look as the night
// scene's own lamps (Night404Lights' LampSpot), so hovering reads as all of
// that billboard's fixtures switching on rather than a single mystery glow.
// It lights the pole and frame the way real floodlights would (the face
// itself is unlit and gets its own tint, see Billboards.tsx).
export default function HoverSpot() {
  const lights = useRef<(THREE.SpotLight | null)[]>([]);
  const targets = useMemo(() => Array.from({ length: MAX_LAMPS }, () => new THREE.Object3D()), []);
  const level = useRef(0);

  useFrame((_, dt) => {
    const id = interactionState.hovered;
    const t = id ? interactionState.targets.find((x) => x.id === id) : null;
    level.current = THREE.MathUtils.damp(level.current, t ? 1 : 0, 7, dt);
    const intensity = level.current * level.current * PEAK;

    const offsets = t ? lampOffsets(t.panelW) : [];
    for (let i = 0; i < MAX_LAMPS; i++) {
      const l = lights.current[i];
      if (!l) continue;
      const lx = offsets[i];
      if (!t || lx === undefined) {
        l.intensity = 0;
        continue;
      }
      l.intensity = intensity;

      // mirrors the floodlight housing placement in makeBillboardGeometry
      const tk = THREE.MathUtils.clamp(t.panelH * 0.07, 0.2, 1.3);
      const fw = Math.max(tk * 0.9, t.panelH * 0.045);
      const u = THREE.MathUtils.clamp(t.panelH * 0.062, 0.2, 1.3);
      const lampY = t.poleH + t.panelH + fw * 0.8 + u * 0.95;
      const lampZ = BILL_Z + tk * 0.9 + u * 1.62;
      const targetY = t.poleH + t.panelH * 0.55;
      const dy = lampY - targetY;

      l.position.set(t.x + lx, lampY, lampZ);
      l.angle = Math.atan2(t.panelW * 0.28, dy);
      l.distance = dy * 3;
      targets[i].position.set(t.x + lx, targetY, BILL_Z);
    }
  });

  return (
    <>
      {targets.map((target, i) => (
        <group key={i}>
          <spotLight
            ref={(el) => {
              lights.current[i] = el;
            }}
            target={target}
            penumbra={0.5}
            decay={2}
            color={COLOR}
            intensity={0}
          />
          <primitive object={target} />
        </group>
      ))}
    </>
  );
}
