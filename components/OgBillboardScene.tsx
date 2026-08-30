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

// The road (a straight strip along X, the same axis the billboard sits on,
// echoing the live scene's highway) is centered on this Z and this wide —
// everything else (decor zones, terrain flattening) is measured against it.
const ROAD_Z = 8;
const ROAD_HALF_W = 6;

export interface TreeItem {
  kind: "round" | "tall" | "pine";
  x: number;
  z: number;
  scale: number;
}
export interface RockItem {
  x: number;
  z: number;
  scale: number;
}
export interface BushItem {
  x: number;
  z: number;
  scale: number;
}
export interface GrassItem {
  x: number;
  z: number;
  scale: number;
}
export interface PoleItem {
  x: number;
  z: number;
  scale: number;
}
export interface CloudItem {
  x: number;
  y: number;
  z: number;
  scale: number;
}
export interface HillItem {
  x: number;
  z: number;
  sx: number;
  sy: number;
}
export interface CameraConfig {
  x: number;
  y: number;
  z: number;
  lookX: number;
  lookY: number;
  lookZ: number;
  fov: number;
}
export interface SceneConfig {
  camera: CameraConfig;
  trees: TreeItem[];
  rocks: RockItem[];
  bushes: BushItem[];
  grass: GrassItem[];
  poles: PoleItem[];
  clouds: CloudItem[];
  hills: HillItem[];
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

// Gentle rolling relief, flattened to nothing across the road/billboard
// corridor so nothing floats or sinks where props actually stand — the
// same shape as the live scene's groundHeight(), just tuned down to a
// subtle amount for a single hero shot instead of a mile of highway.
function terrainHeight(x: number, z: number): number {
  const distFromCorridor = Math.max(0, Math.abs(z - ROAD_Z + 1) - (ROAD_HALF_W + 3));
  const taper = 1 - Math.exp(-((distFromCorridor / 11) ** 2));
  const roll = Math.sin(x * 0.045 + z * 0.05) * 0.35 + Math.sin(x * 0.021 - z * 0.032) * 0.55;
  return roll * taper;
}

function terrainTint(x: number, z: number): number {
  return Math.sin(x * 0.05 + z * 0.06) * 0.5 + Math.sin(x * 0.011) * 0.5;
}

// Low-poly ground with real vertex relief (see terrainHeight) instead of a
// flat plane, plus a two-lane road with painted shoulders and a dashed
// center line — a scaled-down version of the live scene's Ground/Road.
function Terrain() {
  const geometry = useMemo(() => {
    const width = 260;
    const depth = 260;
    const cols = 52;
    const rows = 52;
    const cz = -18; // ground patch centered a bit behind the road, toward the background decor

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

      {/* asphalt */}
      <mesh position={[0, 0.02, ROAD_Z]} receiveShadow>
        <boxGeometry args={[roadLen, 0.04, ROAD_HALF_W * 2]} />
        <meshStandardMaterial color={PAL.road} roughness={1} metalness={0} />
      </mesh>
      {/* shoulders */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.012, ROAD_Z + s * (ROAD_HALF_W + 0.9)]} receiveShadow>
          <boxGeometry args={[roadLen, 0.024, 1.8]} />
          <meshStandardMaterial color={PAL.shoulder} roughness={1} metalness={0} />
        </mesh>
      ))}
      {/* solid edge lines */}
      {[-1, 1].map((s) => (
        <mesh key={`edge-${s}`} position={[0, 0.045, ROAD_Z + s * (ROAD_HALF_W - 0.4)]}>
          <boxGeometry args={[roadLen, 0.02, 0.16]} />
          <meshBasicMaterial color={PAL.roadLine} toneMapped={false} />
        </mesh>
      ))}
      {/* dashed center line */}
      {Array.from({ length: dashCount }).map((_, i) => (
        <mesh key={`dash-${i}`} position={[-roadLen / 2 + 3 + i * 6, 0.05, ROAD_Z]}>
          <boxGeometry args={[2.6, 0.02, 0.22]} />
          <meshBasicMaterial color={PAL.roadLine} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

// The live scene's own low-poly trees/rocks/bushes/grass/poles/clouds/hills,
// placed from `scene` instead of a fixed layout — fully editable from
// OgScenePanel, organically scattered by default rather than gridded.
function Decor({ scene }: { scene: SceneConfig }) {
  const trees = useMemo(
    () => scene.trees.map((t) => ({ ...t, geometry: makeTreeGeometry(t.kind) })),
    [scene.trees],
  );
  useEffect(() => () => trees.forEach((t) => t.geometry.dispose()), [trees]);

  const rocks = useMemo(() => scene.rocks.map((r) => ({ ...r, geometry: makeRockGeometry() })), [scene.rocks]);
  useEffect(() => () => rocks.forEach((r) => r.geometry.dispose()), [rocks]);

  const bushes = useMemo(() => scene.bushes.map((b) => ({ ...b, geometry: makeBushGeometry() })), [scene.bushes]);
  useEffect(() => () => bushes.forEach((b) => b.geometry.dispose()), [bushes]);

  const grassGeometry = useMemo(() => makeGrassTuftGeometry(), []);
  useEffect(() => () => grassGeometry.dispose(), [grassGeometry]);

  const poles = useMemo(
    () => scene.poles.map((p) => ({ ...p, pole: makePowerPoleGeometry(), wire: makePowerWireGeometry(13) })),
    [scene.poles],
  );
  useEffect(
    () => () =>
      poles.forEach((p) => {
        p.pole.dispose();
        p.wire.dispose();
      }),
    [poles],
  );

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
          position={[t.x, terrainHeight(t.x, t.z), t.z]}
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
          position={[r.x, terrainHeight(r.x, r.z), r.z]}
          scale={r.scale}
          receiveShadow
        />
      ))}
      {bushes.map((b, i) => (
        <mesh
          key={`bush-${i}`}
          geometry={b.geometry}
          material={vertexColorMat}
          position={[b.x, terrainHeight(b.x, b.z), b.z]}
          scale={b.scale}
          castShadow
          receiveShadow
        />
      ))}
      {scene.grass.map((g, i) => (
        <mesh
          key={`grass-${i}`}
          geometry={grassGeometry}
          material={vertexColorMat}
          position={[g.x, terrainHeight(g.x, g.z), g.z]}
          scale={g.scale}
        />
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
      {scene.hills.map((h, i) => (
        <mesh key={`hill-${i}`} position={[h.x, -h.sy * 0.55, h.z]} scale={[h.sx, h.sy, h.sx]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color={hillColor} roughness={1} />
        </mesh>
      ))}
    </>
  );
}

// Applies the live camera config every frame — same pattern as DebugSync —
// so dragging a slider in the panel moves the actual render camera, not just
// the initial one Canvas mounts with.
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

// Deterministic PRNG (mulberry32) — the default decor layout below is
// randomized but fixed, so the OG render stays identical across requests.
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

// A hand-tuned but organically-scattered default scene: dense clustered
// tree lines behind the billboard, a couple of big trees close to camera on
// either side for foreground framing, rocks/bushes/grass tucked along the
// roadside, one utility pole, and soft background hills — replacing the old
// perfectly mirrored grid layout.
function buildDefaultScene(): SceneConfig {
  const rng = mulberry32(20260830);
  const rand = (a: number, b: number) => a + rng() * (b - a);
  const kinds: TreeItem["kind"][] = ["round", "tall", "pine"];
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  const trees: TreeItem[] = [];
  const rocks: RockItem[] = [];
  const bushes: BushItem[] = [];
  const grass: GrassItem[] = [];

  for (const side of [-1, 1] as const) {
    // foreground framing trees, between the road and the camera
    for (let i = 0; i < 2; i++) {
      trees.push({ kind: pick(kinds), x: side * rand(11, 21), z: rand(15, 19), scale: rand(1.55, 1.95) });
    }
    // dense mid band right behind the billboard
    for (let i = 0; i < 8; i++) {
      trees.push({ kind: pick(kinds), x: side * rand(7, 32), z: rand(-24, -3), scale: rand(0.85, 1.35) });
    }
    // sparser far band for depth
    for (let i = 0; i < 6; i++) {
      trees.push({ kind: pick(kinds), x: side * rand(6, 40), z: rand(-46, -26), scale: rand(0.55, 0.95) });
    }
    // rocks and bushes tucked along the roadside grass
    for (let i = 0; i < 4; i++) {
      rocks.push({ x: side * rand(3, 15), z: rand(-9, -1), scale: rand(0.32, 0.62) });
    }
    for (let i = 0; i < 3; i++) {
      const z = rng() < 0.5 ? rand(-8, -1) : rand(15.5, 19);
      bushes.push({ x: side * rand(5.5, 14), z, scale: rand(0.7, 1.15) });
    }
    // grass tufts scattered everywhere but on the asphalt
    for (let i = 0; i < 14; i++) {
      const z = rng() < 0.5 ? rand(-22, -1) : rand(15, 20);
      grass.push({ x: side * rand(1, 34), z, scale: rand(0.7, 1.3) });
    }
  }

  return {
    camera: {
      x: -9,
      y: POLE_H * 1.05,
      z: PANEL_W * 1.85,
      lookX: 2,
      lookY: POLE_H + PANEL_H * 0.32,
      lookZ: 0,
      fov: 42,
    },
    trees,
    rocks,
    bushes,
    grass,
    poles: [{ x: 8.5, z: 15, scale: 1.15 }],
    clouds: [
      { x: -48, y: 30, z: -50, scale: 3.2 },
      { x: 44, y: 34, z: -60, scale: 3.8 },
      { x: -60, y: 26, z: -70, scale: 2.8 },
    ],
    hills: [
      { x: -30, z: -70, sx: 55, sy: 13 },
      { x: 25, z: -80, sx: 65, sy: 15 },
      { x: -5, z: -95, sx: 70, sy: 12 },
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
    <div style={{ width: 1200, height: 630 }}>
      <Canvas
        dpr={1}
        shadows="soft"
        camera={{
          fov: scene.camera.fov,
          near: 1,
          far: 1700, // SkyDome is a radius-1500 sphere — must stay inside far
          position: [scene.camera.x, scene.camera.y, scene.camera.z],
        }}
        gl={{ antialias: true, powerPreference: "high-performance", stencil: false, alpha: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.9;
        }}
      >
        <fog attach="fog" args={[PAL.fog, 60, 260]} />
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
