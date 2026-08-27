"use client";
import * as THREE from "three";
import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { useStore } from "@/lib/store";
import { computeLayout } from "@/lib/layout";
import { PAL } from "@/lib/palette";
import SkyDome from "./SkyDome";
import Lights from "./Lights";
import Ground from "./Ground";
import Road from "./Road";
import Billboards from "./Billboards";
import Decor from "./Decor";
import Clouds from "./Clouds";
import Cars from "./Cars";
import Helicopter from "./Helicopter";
import CameraRig from "./CameraRig";

export default function Scene() {
  const billboards = useStore((s) => s.billboards);
  const layout = useMemo(() => computeLayout(billboards), [billboards]);

  return (
    <Canvas
      shadows="soft"
      dpr={[1, 1.75]}
      camera={{ fov: 45, near: 0.5, far: 3200, position: [0, 45, 90] }}
      gl={{ antialias: true, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.12;
      }}
    >
      <fog attach="fog" args={[PAL.fog, 180, 1200]} />
      <SkyDome />
      <Lights />
      <Ground layout={layout} />
      <Road layout={layout} />
      <Billboards layout={layout} />
      <Decor layout={layout} />
      <Clouds layout={layout} />
      <Cars layout={layout} />
      <Helicopter layout={layout} />
      <CameraRig layout={layout} />
    </Canvas>
  );
}
