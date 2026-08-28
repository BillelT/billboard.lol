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
import Birds from "./Birds";
import CameraRig from "./CameraRig";
import PerfProbe from "./PerfProbe";
import AdaptiveDpr from "./AdaptiveDpr";
import DebugSync from "./DebugSync";
import { perfEnabled } from "@/lib/perfState";
import { debugEnabled, debugState } from "@/lib/debugState";

const MAX_DPR = 1.75;

export default function Scene() {
  const billboards = useStore((s) => s.billboards);
  const layout = useMemo(() => computeLayout(billboards), [billboards]);
  const perf = useMemo(() => perfEnabled(), []);
  const debug = useMemo(() => debugEnabled(), []);

  return (
    <Canvas
      shadows="soft"
      dpr={[1, MAX_DPR]}
      camera={{ fov: 45, near: 1, far: 2400, position: [0, 45, 90] }}
      gl={{
        antialias: true, // WebGL2 MSAA, cheaper and sharper than post-process AA
        powerPreference: "high-performance",
        stencil: false,
        alpha: false, // the sky dome covers every pixel, skip compositing
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = debugState.light.exposure;
      }}
    >
      {/* Haze starts close and climbs slowly all the way out. Exponential fog
          did the opposite — nothing nearby, then a sharp wall — and a short
          linear range put a visible band where it topped out. */}
      <fog attach="fog" args={[PAL.fog, debugState.fog.near, debugState.fog.far]} />
      <SkyDome />
      <Lights />
      <Ground layout={layout} />
      <Road layout={layout} />
      <Billboards layout={layout} />
      <Decor layout={layout} />
      <Clouds layout={layout} />
      <Cars layout={layout} />
      <Helicopter layout={layout} />
      <Birds layout={layout} />
      <CameraRig layout={layout} />
      <AdaptiveDpr max={MAX_DPR} />
      {perf && <PerfProbe />}
      {debug && <DebugSync />}
    </Canvas>
  );
}
