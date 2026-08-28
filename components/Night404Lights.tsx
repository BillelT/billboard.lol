"use client";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { NIGHT } from "@/lib/nightPalette";
import { BILL_Z } from "@/lib/layout";

// One dim, cool moon fill (see Lights.tsx for its daytime counterpart) plus
// two spotlights standing in for the billboard's own floodlights — one bright
// and steady, one dead-and-flickering to match the crooked lamp modelled in
// nightGeometry's makeBrokenBillboardGeometry.
function LampSpot({ x, intensity, flicker }: { x: number; intensity: number; flicker?: boolean }) {
  const light = useRef<THREE.SpotLight>(null);
  const target = useRef<THREE.Object3D>(null);

  useEffect(() => {
    if (light.current && target.current) light.current.target = target.current;
  }, []);

  useFrame(({ clock }) => {
    if (!flicker || !light.current) return;
    const t = clock.elapsedTime;
    const n = Math.sin(t * 13.7) * 0.5 + Math.sin(t * 29.3) * 0.3 + Math.sin(t * 4.1) * 0.4;
    light.current.intensity = intensity * (0.35 + 0.65 * Math.max(0, n * 0.5 + 0.5));
  });

  return (
    <>
      <spotLight
        ref={light}
        position={[x, 15.3, BILL_Z + (flicker ? 0.5 : 1.3)]}
        angle={0.46}
        penumbra={0.55}
        decay={2}
        distance={32}
        color={NIGHT.lampGlow}
        intensity={intensity}
        castShadow={!flicker}
        shadow-mapSize={[1024, 1024]}
      />
      <object3D ref={target} position={[x, 7.6, BILL_Z]} />
    </>
  );
}

export default function Night404Lights() {
  return (
    <>
      <hemisphereLight args={[NIGHT.hemiSky, NIGHT.hemiGround, 0.9]} />
      <directionalLight color={NIGHT.moonLight} intensity={0.55} position={[-40, 70, 50]} />
      {/* x=-4.3 is the dead/crooked lamp modelled in nightGeometry, x=+4.3 the live one */}
      <LampSpot x={-4.3} intensity={40} flicker />
      <LampSpot x={4.3} intensity={95} />
    </>
  );
}
