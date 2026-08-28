"use client";
import * as THREE from "three";
import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import type { SceneLayout } from "@/lib/layout";
import { NIGHT } from "@/lib/nightPalette";
import Night404SkyDome from "./Night404SkyDome";
import Night404Lights from "./Night404Lights";
import Ground from "./Ground";
import Road from "./Road";
import Decor from "./Decor";
import Night404Billboard from "./Night404Billboard";
import Night404CameraRig from "./Night404CameraRig";
import AdaptiveDpr from "./AdaptiveDpr";

const MAX_DPR = 1.75;

// The road, the grass and the treeline are the exact same geometry the main
// site drives past (Ground/Road/Decor) — this page just relights them for
// night instead of reskinning them, and only ever asks for a slice of world
// around the one billboard that's still standing here.
const NIGHT_LAYOUT: SceneLayout = { items: [], startX: -46, endX: 46 };

export default function Night404Scene() {
  const layout = useMemo(() => NIGHT_LAYOUT, []);

  return (
    <Canvas
      shadows="soft"
      dpr={[1, MAX_DPR]}
      camera={{ fov: 42, near: 1, far: 2400, position: [-3.1, 13.2, 28.5] }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        stencil: false,
        alpha: false,
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.95;
      }}
    >
      <fog attach="fog" args={[NIGHT.fog, 15, 240]} />
      <Night404SkyDome />
      <Night404Lights />
      <Ground layout={layout} />
      <Road layout={layout} />
      <Decor layout={layout} />
      <Night404Billboard />
      <Night404CameraRig />
      <AdaptiveDpr max={MAX_DPR} />
    </Canvas>
  );
}
