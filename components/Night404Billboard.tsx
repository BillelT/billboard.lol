"use client";
import * as THREE from "three";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ThreeEvent } from "@react-three/fiber";
import { makeBrokenBillboardGeometry } from "@/lib/nightGeometry";
import { makeErrorFaceTexture, makeSpiderwebTexture } from "@/lib/nightTexture";
import { BILL_Z } from "@/lib/layout";
import { vertexColorMat } from "./materials";
import Night404Crow from "./Night404Crow";

export const PANEL_W = 18;
export const PANEL_H = 9.6;
export const POLE_H = 5.2;

// The one billboard on this stretch of road: the same structural language as
// Billboards.tsx, but broken and lit for night, with a single clickable face
// that is the entire point of the page.
export default function Night404Billboard() {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  const geometry = useMemo(() => makeBrokenBillboardGeometry(PANEL_W, PANEL_H, POLE_H), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const faceTex = useMemo(() => makeErrorFaceTexture(), []);
  useEffect(() => () => faceTex.dispose(), [faceTex]);

  const webTex = useMemo(() => makeSpiderwebTexture(), []);
  useEffect(() => () => webTex.dispose(), [webTex]);

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  const tk = THREE.MathUtils.clamp(PANEL_H * 0.07, 0.2, 1.3);
  const midY = POLE_H + PANEL_H / 2;
  const top = POLE_H + PANEL_H;
  // Clear of the cap's own front face (it juts out to ~1.8*tk) so the web
  // reads as strung in open air in front of the structure, not buried in it.
  const webZ = tk * 2.1;

  // makeSpiderwebTexture draws its dense hub at the canvas's top-left corner
  // — but a PlaneGeometry is centered on its own mesh position, so "anchor at
  // (x, y)" means offsetting the mesh by half the plane's own size (and
  // un-mirroring that offset when the plane is flipped to hang the web off a
  // different corner). Without this the web renders half a plane-width away
  // from the corner it's meant to be attached to.
  const web = (anchorX: number, anchorY: number, size: number, mirrorX = false, mirrorY = false) => {
    const sx = mirrorX ? -1 : 1;
    const sy = mirrorY ? -1 : 1;
    return {
      position: [anchorX + (sx * size) / 2, anchorY - (sy * size) / 2, webZ] as [number, number, number],
      scale: [sx, sy, 1] as [number, number, number],
    };
  };
  const webTopRight = web(PANEL_W / 2, top, 3.6, true);

  const goHome = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    router.push("/");
  };

  return (
    <group position={[0, 0, BILL_Z]}>
      <mesh geometry={geometry} material={vertexColorMat} castShadow receiveShadow />

      <mesh
        position={[0, midY, tk / 2 + 0.03]}
        onClick={goHome}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[PANEL_W * 0.96, PANEL_H * 0.92]} />
        <meshBasicMaterial map={faceTex} toneMapped={false} />
      </mesh>

      {/* one cobweb strung across the top-right frame corner, in front of the structure */}
      <mesh position={webTopRight.position} scale={webTopRight.scale}>
        <planeGeometry args={[3.6, 3.6]} />
        <meshBasicMaterial map={webTex} transparent depthWrite={false} toneMapped={false} />
      </mesh>

      <Night404Crow position={[PANEL_W * 0.44, top + 0.85, tk * 0.9]} />
    </group>
  );
}
