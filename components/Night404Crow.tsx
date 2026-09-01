"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { makeCrowGeometry } from "@/lib/nightGeometry";
import { vertexColorMat } from "./materials";

// Perched sideways to the camera — a bird silhouette only reads as a bird in
// profile, where the head, beak and tail separate into distinct shapes rather
// than foreshortening into one dark lump. The whole merged body sways gently
// and glances side to side on top of that, which reads as alert/watching
// without needing separate animated parts.
const BASE_YAW = Math.PI * 0.62;

export default function Night404Crow({ position }: { position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(() => makeCrowGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.rotation.y = BASE_YAW + Math.sin(t * 0.4) * 0.22;
    g.position.y = position[1] + Math.sin(t * 1.6) * 0.015;
  });

  return (
    <group ref={group} position={position} rotation={[0, BASE_YAW, 0]} scale={1.5}>
      <mesh geometry={geometry} material={vertexColorMat} castShadow />
    </group>
  );
}
