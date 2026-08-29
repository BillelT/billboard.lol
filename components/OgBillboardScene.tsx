"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { makeBillboardGeometry, makeTreeGeometry, makeRockGeometry, makeCloudGeometry } from "@/lib/geometry";
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
//
// The billboard's own footprint (panel + posts) sits around z -1..0.5 — the
// road has to stay well clear of that band, further toward the camera, or
// the billboard reads as standing in the middle of the road instead of on
// the grass beside it.
function SimpleGround() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -6]} receiveShadow>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color={PAL.grass} roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, 0.02, 8]} receiveShadow>
        <boxGeometry args={[90, 0.04, 12]} />
        <meshStandardMaterial color={PAL.road} roughness={1} metalness={0} />
      </mesh>
    </>
  );
}

// A denser stand of the live scene's own low-poly trees and rocks, scattered
// behind and beside the billboard for depth — same geometry/palette Decor.tsx
// uses, just a fixed hand-placed layout instead of a density-driven field.
const TREE_LAYOUT: { kind: "round" | "tall" | "pine"; x: number; z: number; scale: number }[] = [
  { kind: "pine", x: -20, z: -14, scale: 1.25 },
  { kind: "round", x: -14, z: -19, scale: 1.1 },
  { kind: "tall", x: -23, z: -8, scale: 1.3 },
  { kind: "pine", x: -27, z: -18, scale: 1.05 },
  { kind: "round", x: -9, z: -24, scale: 0.95 },
  { kind: "pine", x: -32, z: -26, scale: 1.15 },
  { kind: "tall", x: -18, z: -28, scale: 1.2 },
  { kind: "pine", x: 20, z: -15, scale: 1.2 },
  { kind: "round", x: 14, z: -20, scale: 1.0 },
  { kind: "tall", x: 24, z: -9, scale: 1.25 },
  { kind: "pine", x: 28, z: -19, scale: 1.1 },
  { kind: "round", x: 9, z: -25, scale: 0.9 },
  { kind: "pine", x: 33, z: -27, scale: 1.1 },
  { kind: "tall", x: 19, z: -29, scale: 1.15 },
];

const ROCK_LAYOUT: { x: number; z: number; scale: number }[] = [
  { x: -12, z: 3, scale: 0.55 },
  { x: -9.5, z: 6.5, scale: 0.4 },
  { x: 11, z: 4, scale: 0.6 },
  { x: 8.5, z: 7, scale: 0.42 },
  { x: -6, z: -3, scale: 0.35 },
  { x: 6.5, z: -2.5, scale: 0.45 },
];

const CLOUD_LAYOUT: { x: number; y: number; z: number; scale: number }[] = [
  { x: -48, y: 30, z: -50, scale: 3.2 },
  { x: 44, y: 34, z: -60, scale: 3.8 },
  { x: -60, y: 26, z: -70, scale: 2.8 },
];

// Soft, hazy mounds well past the tree line — just enough relief that the
// horizon doesn't read as a flat green wall, fading toward the fog color the
// way distant terrain does in the live scene.
const HILL_LAYOUT: { x: number; z: number; sx: number; sy: number }[] = [
  { x: -30, z: -70, sx: 55, sy: 13 },
  { x: 25, z: -80, sx: 65, sy: 15 },
  { x: -5, z: -95, sx: 70, sy: 12 },
];

function Decor() {
  const trees = useMemo(
    () => TREE_LAYOUT.map((t) => ({ ...t, geometry: makeTreeGeometry(t.kind) })),
    [],
  );
  useEffect(() => () => trees.forEach((t) => t.geometry.dispose()), [trees]);

  const rocks = useMemo(() => ROCK_LAYOUT.map((r) => ({ ...r, geometry: makeRockGeometry() })), []);
  useEffect(() => () => rocks.forEach((r) => r.geometry.dispose()), [rocks]);

  const cloudGeometry = useMemo(() => makeCloudGeometry(), []);
  useEffect(() => () => cloudGeometry.dispose(), [cloudGeometry]);
  const cloudMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#ffffff",
        emissiveIntensity: 0.55,
        roughness: 1,
        fog: false, // otherwise they blend into the near-identical sky-fog color
      }),
    [],
  );
  useEffect(() => () => cloudMaterial.dispose(), [cloudMaterial]);

  const hillColor = useMemo(() => new THREE.Color(PAL.grass).lerp(new THREE.Color(PAL.fog), 0.45), []);

  return (
    <>
      {trees.map((t, i) => (
        <mesh
          key={`tree-${i}`}
          geometry={t.geometry}
          material={vertexColorMat}
          position={[t.x, 0, t.z]}
          scale={t.scale}
          castShadow
          receiveShadow
        />
      ))}
      {rocks.map((r, i) => (
        <mesh
          key={`rock-${i}`}
          geometry={r.geometry}
          material={vertexColorMat}
          position={[r.x, 0, r.z]}
          scale={r.scale}
          receiveShadow
        />
      ))}
      {CLOUD_LAYOUT.map((c, i) => (
        <mesh key={`cloud-${i}`} geometry={cloudGeometry} material={cloudMaterial} position={[c.x, c.y, c.z]} scale={c.scale} />
      ))}
      {HILL_LAYOUT.map((h, i) => (
        <mesh key={`hill-${i}`} position={[h.x, -h.sy * 0.55, h.z]} scale={[h.sx, h.sy, h.sx]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color={hillColor} roughness={1} />
        </mesh>
      ))}
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
        <Decor />
        <Billboard data={data} icon={icon} />
        {iconSettled && <ReadySignal onReady={() => setReady(true)} />}
      </Canvas>
      {ready && <div data-og-ready="true" style={{ position: "fixed", width: 0, height: 0 }} />}
    </div>
  );
}
