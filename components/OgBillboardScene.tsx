"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { makeBillboardGeometry } from "@/lib/geometry";
import { FACE_RES, makeFaceTexture } from "@/lib/textures";
import { iconSrc } from "@/lib/icons";
import { PAL } from "@/lib/palette";
import { vertexColorMat } from "./materials";
import SkyDome from "./SkyDome";
import Lights from "./Lights";

export interface OgBillboardData {
  name: string;
  color: string;
  amount: number;
  description?: string | null;
  title?: string | null;
  category?: string | null;
  clickCount?: number | null;
  claimedAt?: string | null;
}

// A single, standalone-sized panel — the OG card isn't tied to the live
// ranking's rank-scaled dimensions, just a clearly-legible #1 billboard.
const PANEL_H = 7.4;
const PANEL_W = PANEL_H * 1.9;
const POLE_H = 1.8 + PANEL_H * 0.36;

function Billboard({ data, icon }: { data: OgBillboardData; icon: HTMLImageElement | null }) {
  const geometry = useMemo(() => makeBillboardGeometry(PANEL_W, PANEL_H, POLE_H), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const texture = useMemo(
    () =>
      makeFaceTexture({
        name: data.name,
        color: data.color,
        amount: data.amount,
        rank: 1,
        res: FACE_RES,
        icon,
        title: data.title,
        description: data.description,
        category: data.category,
        clickCount: data.clickCount,
        claimedAt: data.claimedAt,
      }),
    [data, icon],
  );
  useEffect(() => () => texture.dispose(), [texture]);

  const tk = THREE.MathUtils.clamp(PANEL_H * 0.07, 0.2, 1.3);

  return (
    <group>
      <mesh geometry={geometry} material={vertexColorMat} castShadow receiveShadow />
      <mesh position={[0, POLE_H + PANEL_H / 2, tk / 2 + 0.03]}>
        <planeGeometry args={[PANEL_W * 0.96, PANEL_H * 0.92]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

// Flat grass plane + a short strip of asphalt — real geometry, just stripped
// down to what one centered billboard needs. The live scene's own Ground/Road
// are built around the whole ranking's layout and decor density, which don't
// apply to a single standalone panel.
function SimpleGround() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -6]} receiveShadow>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color={PAL.grass} roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, 0.02, -1]} receiveShadow>
        <boxGeometry args={[80, 0.04, 9]} />
        <meshStandardMaterial color={PAL.road} roughness={1} metalness={0} />
      </mesh>
    </>
  );
}

// Fires once a few frames have painted after the texture (and its favicon,
// if any) settled — so the headless screenshot never catches a half-drawn
// first frame.
function ReadySignal({ onReady }: { onReady: () => void }) {
  const fired = useRef(false);
  const frames = useRef(0);
  useFrame(() => {
    if (fired.current) return;
    frames.current += 1;
    if (frames.current >= 3) {
      fired.current = true;
      onReady();
    }
  });
  return null;
}

export default function OgBillboardScene({ data }: { data: OgBillboardData }) {
  const [icon, setIcon] = useState<HTMLImageElement | null>(null);
  const [iconSettled, setIconSettled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let done = false;
    const finish = (img: HTMLImageElement | null) => {
      if (done) return;
      done = true;
      setIcon(img);
      setIconSettled(true);
    };
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    img.src = iconSrc(data.name);
    const timeout = setTimeout(() => finish(null), 1500);
    return () => clearTimeout(timeout);
  }, [data.name]);

  return (
    <div style={{ width: 1200, height: 630 }}>
      <Canvas
        dpr={1}
        shadows="soft"
        camera={{
          fov: 42,
          near: 1,
          far: 1700, // SkyDome is a radius-1500 sphere — must stay inside far
          position: [0, POLE_H * 0.85, PANEL_W * 1.35],
        }}
        gl={{ antialias: true, powerPreference: "high-performance", stencil: false, alpha: false }}
        onCreated={({ gl, camera }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.9;
          camera.lookAt(0, POLE_H + PANEL_H * 0.42, 0);
        }}
      >
        <fog attach="fog" args={[PAL.fog, 60, 260]} />
        <SkyDome />
        <Lights />
        <SimpleGround />
        <Billboard data={data} icon={icon} />
        {iconSettled && <ReadySignal onReady={() => setReady(true)} />}
      </Canvas>
      {ready && <div data-og-ready="true" style={{ position: "fixed", width: 0, height: 0 }} />}
    </div>
  );
}
