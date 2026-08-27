"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  makeHelicopterGeometry,
  makeMainRotorGeometry,
  makeTailRotorGeometry,
} from "@/lib/geometry";
import { makeBannerTexture } from "@/lib/textures";
import { BILL_Z, fmtUSD, type SceneLayout } from "@/lib/layout";
import { vertexColorMat } from "./materials";
import { placementOf, sceneAudio } from "@/lib/audio";

const BANNER_W = 18;
const BANNER_H = 3;
const BANNER_SEG = 32;

// Ad plane of the aerial section: a low-poly chopper towing a banner that
// advertises whoever currently holds #1. It loops across the giant billboards,
// so it's only ever in frame while the camera is still up in the sky.
export default function Helicopter({ layout }: { layout: SceneLayout }) {
  const group = useRef<THREE.Group>(null);
  const rotor = useRef<THREE.Mesh>(null);
  const tailRotor = useRef<THREE.Mesh>(null);
  const banner = useRef<THREE.Mesh>(null);

  const top = layout.items[0];
  const text = top ? `NOW #1 · ${top.name.toUpperCase()} · ${fmtUSD(top.amount)}` : "OUTGROW.LOL";

  const geos = useMemo(
    () => ({
      body: makeHelicopterGeometry(),
      main: makeMainRotorGeometry(),
      tail: makeTailRotorGeometry(),
      banner: new THREE.PlaneGeometry(BANNER_W, BANNER_H, BANNER_SEG, 1),
    }),
    [],
  );
  useEffect(
    () => () => Object.values(geos).forEach((g) => g.dispose()),
    [geos],
  );

  const texture = useMemo(() => makeBannerTexture(text), [text]);
  const bannerRest = useMemo(
    () => Float32Array.from(geos.banner.attributes.position.array),
    [geos.banner],
  );

  // Flies between the camera and the #1 billboard, just above its top edge, so
  // it reads against open sky instead of disappearing behind the panel. It only
  // crosses the aerial opening; the camera has descended past it by rank 3.
  const path = useMemo(() => {
    const first = layout.items[0];
    const h = first?.totalH ?? 40;
    return {
      startX: (first?.x ?? 0) - 150,
      spanX: 300,
      y: h * 0.62,
      z: BILL_Z + h * 0.95,
      speed: 11,
    };
  }, [layout]);

  // rotor noise, loudest when the chopper crosses right by the camera
  const voice = useMemo(() => sceneAudio.voice("heli"), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => () => voice.dispose(), [voice]);

  useFrame(({ clock, camera }, dt) => {
    const t = clock.elapsedTime;
    const g = group.current;
    if (!g) return;

    g.position.set(
      path.startX + ((t * path.speed) % path.spanX),
      path.y + Math.sin(t * 0.7) * 1.1,
      path.z + Math.sin(t * 0.31) * 3,
    );
    g.rotation.z = Math.sin(t * 0.7) * 0.045;
    g.rotation.y = Math.sin(t * 0.31) * 0.05;

    voice.place(placementOf(g.position, camera, 190, tmp));

    if (rotor.current) rotor.current.rotation.y += dt * 26;
    if (tailRotor.current) tailRotor.current.rotation.x += dt * 34;

    // ripple the banner, amplitude growing toward the free end
    const pos = banner.current?.geometry.attributes.position;
    if (pos) {
      for (let i = 0; i < pos.count; i++) {
        const x = bannerRest[i * 3];
        const k = (BANNER_W / 2 - x) / BANNER_W; // 0 at the towed edge, 1 at the tail
        pos.setZ(i, Math.sin(t * 6 - x * 0.85) * 0.5 * k * k);
        pos.setY(i, bannerRest[i * 3 + 1] + Math.sin(t * 4.2 - x * 0.6) * 0.22 * k);
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <group ref={group}>
      <mesh geometry={geos.body} material={vertexColorMat} castShadow />
      <mesh ref={rotor} geometry={geos.main} material={vertexColorMat} position={[0, 1.45, 0]} />
      <mesh
        ref={tailRotor}
        geometry={geos.tail}
        material={vertexColorMat}
        position={[-4.9, 0.95, 0.18]}
        rotation={[0, 0, Math.PI / 2]}
      />
      {/* tow rope */}
      <mesh position={[-6.4, 0.1, 0]} rotation={[0, 0, 0.06]}>
        <boxGeometry args={[3.2, 0.06, 0.06]} />
        <meshStandardMaterial color="#4a4f57" roughness={1} />
      </mesh>
      <mesh
        ref={banner}
        geometry={geos.banner}
        position={[-17.1, 0.05, 0]}
        castShadow
      >
        <meshStandardMaterial map={texture} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
    </group>
  );
}
