"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  makeBillboardGeometry,
  makeTreeGeometry,
  makeRockGeometry,
  makeCloudGeometry,
  makeBushGeometry,
  makeGrassTuftGeometry,
  makePowerPoleGeometry,
  makePowerWireGeometry,
} from "@/lib/geometry";
import { FACE_RES, makeFaceTexture } from "@/lib/textures";
import { iconSrc } from "@/lib/icons";
import { PAL } from "@/lib/palette";
import { vertexColorMat } from "./materials";
import SkyDome from "./SkyDome";
import Lights from "./Lights";

const CUSTOM_SKY_FOG = "#baf5fd";

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

const PANEL_H = 7.4;
export const PANEL_W = PANEL_H * 1.9;
const POLE_H = 1.8 + PANEL_H * 0.36;

export const ROAD_Z = 13;
export const ROAD_HALF_W = 6;

export interface TreeItem { kind: "round" | "tall" | "pine"; x: number; z: number; scale: number; }
export interface RockItem { x: number; z: number; scale: number; }
export interface BushItem { x: number; z: number; scale: number; }
export interface GrassItem { x: number; z: number; scale: number; }
export interface PoleItem { x: number; z: number; scale: number; }
export interface CloudItem { x: number; y: number; z: number; scale: number; }
export interface CameraConfig { x: number; y: number; z: number; lookX: number; lookY: number; lookZ: number; fov: number; }
export interface FogConfig { near: number; far: number; }
export interface SceneConfig {
  camera: CameraConfig;
  fog: FogConfig;
  trees: TreeItem[];
  rocks: RockItem[];
  bushes: BushItem[];
  grass: GrassItem[];
  poles: PoleItem[];
  clouds: CloudItem[];
}

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

function terrainHeight(x: number, z: number): number {
  const distFromCorridor = Math.max(0, Math.abs(z - ROAD_Z + 1) - (ROAD_HALF_W + 3));
  const taper = 1 - Math.exp(-((distFromCorridor / 11) ** 2));
  const roll = Math.sin(x * 0.045 + z * 0.05) * 0.35 + Math.sin(x * 0.021 - z * 0.032) * 0.55;
  return roll * taper;
}

function terrainTint(x: number, z: number): number {
  return Math.sin(x * 0.05 + z * 0.06) * 0.5 + Math.sin(x * 0.011) * 0.5;
}

function Terrain() {
  const geometry = useMemo(() => {
    const width = 260;
    const depth = 260;
    const cols = 52;
    const rows = 52;
    const cz = -18;

    const positions = new Float32Array((cols + 1) * (rows + 1) * 3);
    const colors = new Float32Array((cols + 1) * (rows + 1) * 3);
    const grass = new THREE.Color(PAL.grass);
    const light = new THREE.Color(PAL.grassLight);
    const dark = new THREE.Color(PAL.grassDark);
    const c = new THREE.Color();

    let v = 0;
    for (let r = 0; r <= rows; r++) {
      const z = cz - depth / 2 + (depth * r) / rows;
      for (let i = 0; i <= cols; i++) {
        const x = -width / 2 + (width * i) / cols;
        positions[v * 3] = x;
        positions[v * 3 + 1] = terrainHeight(x, z);
        positions[v * 3 + 2] = z;
        const t = terrainTint(x, z);
        c.copy(grass).lerp(t > 0 ? light : dark, Math.abs(t) * 0.6);
        colors[v * 3] = c.r;
        colors[v * 3 + 1] = c.g;
        colors[v * 3 + 2] = c.b;
        v++;
      }
    }

    const stride = cols + 1;
    const indices: number[] = [];
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < cols; i++) {
        const a = r * stride + i;
        const b = a + 1;
        const d = (r + 1) * stride + i;
        const e = d + 1;
        indices.push(a, d, b, b, d, e);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const roadLen = 110;
  const dashCount = Math.floor(roadLen / 6);

  return (
    <>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} metalness={0} />
      </mesh>

      <mesh position={[0, 0.02, ROAD_Z]} receiveShadow>
        <boxGeometry args={[roadLen, 0.04, ROAD_HALF_W * 2]} />
        <meshStandardMaterial color={PAL.road} roughness={1} metalness={0} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.012, ROAD_Z + s * (ROAD_HALF_W + 0.9)]} receiveShadow>
          <boxGeometry args={[roadLen, 0.024, 1.8]} />
          <meshStandardMaterial color={PAL.shoulder} roughness={1} metalness={0} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`edge-${s}`} position={[0, 0.045, ROAD_Z + s * (ROAD_HALF_W - 0.4)]}>
          <boxGeometry args={[roadLen, 0.02, 0.16]} />
          <meshBasicMaterial color={PAL.roadLine} toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: dashCount }).map((_, i) => (
        <mesh key={`dash-${i}`} position={[-roadLen / 2 + 3 + i * 6, 0.05, ROAD_Z]}>
          <boxGeometry args={[2.6, 0.02, 0.22]} />
          <meshBasicMaterial color={PAL.roadLine} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

function Decor({ scene }: { scene: SceneConfig }) {
  const trees = useMemo(() => scene.trees.map((t) => ({ ...t, geometry: makeTreeGeometry(t.kind) })), [scene.trees]);
  useEffect(() => () => trees.forEach((t) => t.geometry.dispose()), [trees]);

  const rocks = useMemo(() => scene.rocks.map((r) => ({ ...r, geometry: makeRockGeometry() })), [scene.rocks]);
  useEffect(() => () => rocks.forEach((r) => r.geometry.dispose()), [rocks]);

  const bushes = useMemo(() => scene.bushes.map((b) => ({ ...b, geometry: makeBushGeometry() })), [scene.bushes]);
  useEffect(() => () => bushes.forEach((b) => b.geometry.dispose()), [bushes]);

  const grassGeometry = useMemo(() => makeGrassTuftGeometry(), []);
  useEffect(() => () => grassGeometry.dispose(), [grassGeometry]);

  const poles = useMemo(() => scene.poles.map((p) => ({ ...p, pole: makePowerPoleGeometry(), wire: makePowerWireGeometry(13) })), [scene.poles]);
  useEffect(() => () => poles.forEach((p) => { p.pole.dispose(); p.wire.dispose(); }), [poles]);

  const cloudGeometry = useMemo(() => makeCloudGeometry(), []);
  useEffect(() => () => cloudGeometry.dispose(), [cloudGeometry]);
  const cloudMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#ffffff",
        emissiveIntensity: 0.1,
        roughness: 0.9,
        fog: true,
      }),
    [],
  );
  useEffect(() => () => cloudMaterial.dispose(), [cloudMaterial]);

  return (
    <>
      {trees.map((t, i) => (
        <mesh key={`tree-${i}`} geometry={t.geometry} material={vertexColorMat} position={[t.x, terrainHeight(t.x, t.z), t.z]} scale={t.scale} castShadow receiveShadow />
      ))}
      {rocks.map((r, i) => (
        <mesh key={`rock-${i}`} geometry={r.geometry} material={vertexColorMat} position={[r.x, terrainHeight(r.x, r.z), r.z]} scale={r.scale} receiveShadow />
      ))}
      {bushes.map((b, i) => (
        <mesh key={`bush-${i}`} geometry={b.geometry} material={vertexColorMat} position={[b.x, terrainHeight(b.x, b.z), b.z]} scale={b.scale} castShadow receiveShadow />
      ))}
      {scene.grass.map((g, i) => (
        <mesh key={`grass-${i}`} geometry={grassGeometry} material={vertexColorMat} position={[g.x, terrainHeight(g.x, g.z), g.z]} scale={g.scale} />
      ))}
      {poles.map((p, i) => (
        <group key={`pole-${i}`} position={[p.x, terrainHeight(p.x, p.z), p.z]} scale={p.scale}>
          <mesh geometry={p.pole} material={vertexColorMat} castShadow receiveShadow />
          <mesh geometry={p.wire} material={vertexColorMat} />
        </group>
      ))}
      {scene.clouds.map((c, i) => (
        <mesh key={`cloud-${i}`} geometry={cloudGeometry} material={cloudMaterial} position={[c.x, c.y, c.z]} scale={c.scale} />
      ))}
    </>
  );
}

function CameraController({ config }: { config: CameraConfig }) {
  const { camera } = useThree();
  useFrame(() => {
    camera.position.set(config.x, config.y, config.z);
    const cam = camera as THREE.PerspectiveCamera;
    if (cam.fov !== config.fov) {
      cam.fov = config.fov;
      cam.updateProjectionMatrix();
    }
    camera.lookAt(config.lookX, config.lookY, config.lookZ);
  });
  return null;
}

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

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BILLBOARD_CLEAR_X = 8.5;
const BILLBOARD_CLEAR_Z: [number, number] = [-3, 4];
function clearsBillboard(x: number, z: number): boolean {
  return Math.abs(x) > BILLBOARD_CLEAR_X || z < BILLBOARD_CLEAR_Z[0] || z > BILLBOARD_CLEAR_Z[1];
}

const CLEAR_ZONE_FAR_Z = -75;

function buildDefaultScene(): SceneConfig {
  const rng = mulberry32(11223344); 
  const rand = (a: number, b: number) => a + rng() * (b - a);
  const kinds: TreeItem["kind"][] = ["round", "tall", "pine"];
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const clearing = (gen: () => { x: number; z: number }) => {
    let p = gen();
    let tries = 0;
    while (!clearsBillboard(p.x, p.z) && tries < 10) {
      p = gen();
      tries++;
    }
    return p;
  };

  const trees: TreeItem[] = [];
  const rocks: RockItem[] = [];
  const bushes: BushItem[] = [];
  const grass: GrassItem[] = [];

  // GAUCHE : Densification organique du premier plan/plan intermédiaire
  for (let i = 0; i < 28; i++) {
    const { x, z } = clearing(() => ({ x: rand(-45, -9), z: rand(-30, 2) }));
    trees.push({ kind: pick(kinds), x, z, scale: rand(0.85, 1.3) });
  }

  // DROITE (Proche) : On éloigne la limite de la route (z s'arrête à -4 au lieu de +5)
  // pour éviter l'alignement rectiligne rouge
  for (let i = 0; i < 18; i++) {
    const { x, z } = clearing(() => ({ x: rand(10, 50), z: rand(-35, -4) }));
    trees.push({ kind: pick(kinds), x, z, scale: rand(0.75, 1.25) });
  }

  // ARRIÈRE-PLAN : Forêt très dense couvrant tout l'horizon
  for (let i = 0; i < 45; i++) {
    const { x, z } = clearing(() => ({ x: rand(-45, 95), z: rand(CLEAR_ZONE_FAR_Z, -15) }));
    trees.push({ kind: pick(kinds), x, z, scale: rand(0.75, 1.3) });
  }
  
  // ARRIÈRE-PLAN DROITE : Extrême densité pour combler le vide repéré en noir
  for (let i = 0; i < 25; i++) {
    const { x, z } = clearing(() => ({ x: rand(30, 95), z: rand(CLEAR_ZONE_FAR_Z, -25) }));
    trees.push({ kind: pick(kinds), x, z, scale: rand(0.75, 1.3) });
  }

  // Buissons, rochers et herbes redistribués pour éviter l'effet "bord de route"
  for (let i = 0; i < 35; i++) {
    const { x, z } = clearing(() => ({ x: rand(-45, 80), z: rand(-45, -2) }));
    bushes.push({ x, z, scale: rand(0.7, 1.2) });
  }
  for (let i = 0; i < 25; i++) {
    const { x, z } = clearing(() => ({ x: rand(-45, 85), z: rand(-50, -2) }));
    rocks.push({ x, z, scale: rand(0.4, 0.75) });
  }
  for (let i = 0; i < 70; i++) {
    const { x, z } = clearing(() => ({ x: rand(-50, 95), z: rand(-65, 4) }));
    grass.push({ x, z, scale: rand(0.7, 1.3) });
  }

  return {
    camera: {
      x: -10.5,
      y: 8.5,
      z: PANEL_W + 10.5,
      lookX: 0.5,
      lookY: 6.5,    
      lookZ: 0,
      fov: 40,
    },
    fog: { near: 0, far: 215 },
    trees,
    rocks,
    bushes,
    grass,
    poles: [{ x: 25, z: 0, scale: 1.15 }, { x: 52, z: -5, scale: 1.10 }],
    
    clouds: [
      { x: 60, y: 21, z: -25, scale: 3.0 },
      { x: 12,  y: 26, z: -50, scale: 2.8 },
      { x: 41,  y: 21, z: -60, scale: 4.2 },
      { x: -15, y: 19, z: -80, scale: 4.5 },
      { x: 75,  y: 36.2, z: -67, scale: 4.5 },
      { x: -28, y: 24, z: -65, scale: 2.0 },
    ],
  };
}

export const DEFAULT_SCENE_CONFIG: SceneConfig = buildDefaultScene();

export default function OgBillboardScene({
  data,
  scene = DEFAULT_SCENE_CONFIG,
}: {
  data: OgBillboardData;
  scene?: SceneConfig;
}) {
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
    <div style={{ width: 1200, height: 630, backgroundColor: "#5cb4f7" }}>
      <Canvas
        dpr={1}
        shadows="soft"
        camera={{
          fov: scene.camera.fov,
          near: 1,
          far: 1700,
          position: [scene.camera.x, scene.camera.y, scene.camera.z],
        }}
        gl={{ antialias: true, powerPreference: "high-performance", stencil: false, alpha: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.9;
        }}
      >
        <fog attach="fog" args={[CUSTOM_SKY_FOG, scene.fog.near, scene.fog.far]} />
        <SkyDome />
        <Lights />
        <Terrain />
        <Decor scene={scene} />
        <Billboard data={data} icon={icon} />
        <CameraController config={scene.camera} />
        {iconSettled && <ReadySignal onReady={() => setReady(true)} />}
      </Canvas>
      {ready && <div data-og-ready="true" style={{ position: "fixed", width: 0, height: 0 }} />}
    </div>
  );
}