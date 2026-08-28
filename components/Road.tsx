"use client";
import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { PAL } from "@/lib/palette";
import { ROAD_W, type SceneLayout } from "@/lib/layout";
import { DECOR_AHEAD_REACH } from "./Decor";
import { makeEdgeFogMaterial, syncEdgeFogUniforms } from "./materials";

// Past each end of the ranking, so the pavement reaches at least as far as
// decor ever gets drawn — otherwise the road ends while the tree line it's
// supposed to run through keeps going, and that seam sits in full view
// instead of fading into fog.
const ROAD_BUFFER = DECOR_AHEAD_REACH + 100;

// Two-lane road: asphalt slab, shoulders, solid edge lines, instanced dashes.
export default function Road({ layout }: { layout: SceneLayout }) {
  const len = layout.endX - layout.startX + ROAD_BUFFER * 2;
  const cx = (layout.startX + layout.endX) / 2;

  // Shared across the asphalt/shoulders/lines/dashes so all of it fades
  // toward the fog color together at the same two edges, in one pass in
  // syncEdgeFogUniforms below.
  const materials = useMemo(
    () => ({
      road: makeEdgeFogMaterial(PAL.road, 1),
      shoulder: makeEdgeFogMaterial(PAL.shoulder, 1),
      line: makeEdgeFogMaterial(PAL.roadLine, 0.9),
    }),
    [],
  );

  useEffect(
    () => () => {
      materials.road.dispose();
      materials.shoulder.dispose();
      materials.line.dispose();
    },
    [materials],
  );

  const dashes = useMemo(() => {
    const count = Math.floor(len / 9);
    const geo = new THREE.BoxGeometry(2.4, 0.04, 0.26);
    const mesh = new THREE.InstancedMesh(geo, materials.line, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      dummy.position.set(layout.startX - ROAD_BUFFER + 4.5 + i * 9, 0.065, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.receiveShadow = true;
    return mesh;
  }, [len, layout.startX, materials.line]);

  useEffect(() => () => dashes.geometry.dispose(), [dashes]);

  useFrame(() => {
    syncEdgeFogUniforms(materials.road, layout.startX, layout.endX);
    syncEdgeFogUniforms(materials.shoulder, layout.startX, layout.endX);
    syncEdgeFogUniforms(materials.line, layout.startX, layout.endX);
  });

  return (
    <group position={[cx, 0, 0]}>
      <mesh position={[0, 0.02, 0]} material={materials.road} receiveShadow>
        <boxGeometry args={[len, 0.04, ROAD_W]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.012, s * (ROAD_W / 2 + 0.8)]} material={materials.shoulder} receiveShadow>
          <boxGeometry args={[len, 0.024, 1.6]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`l${s}`} position={[0, 0.05, s * (ROAD_W / 2 - 0.45)]} material={materials.line} receiveShadow>
          <boxGeometry args={[len, 0.03, 0.18]} />
        </mesh>
      ))}
      <primitive object={dashes} position={[-cx, 0, 0]} />
    </group>
  );
}
