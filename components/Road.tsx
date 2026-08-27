"use client";
import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { PAL } from "@/lib/palette";
import { ROAD_W, type SceneLayout } from "@/lib/layout";

// Two-lane road: asphalt slab, shoulders, solid edge lines, instanced dashes.
export default function Road({ layout }: { layout: SceneLayout }) {
  const len = layout.endX - layout.startX + 600;
  const cx = (layout.startX + layout.endX) / 2;

  const dashes = useMemo(() => {
    const count = Math.floor(len / 9);
    const geo = new THREE.BoxGeometry(2.4, 0.04, 0.26);
    const mat = new THREE.MeshStandardMaterial({ color: PAL.roadLine, roughness: 0.9 });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      dummy.position.set(layout.startX - 300 + 4.5 + i * 9, 0.065, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.receiveShadow = true;
    return mesh;
  }, [len, layout.startX]);

  useEffect(
    () => () => {
      dashes.geometry.dispose();
      (dashes.material as THREE.Material).dispose();
    },
    [dashes],
  );

  return (
    <group position={[cx, 0, 0]}>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[len, 0.04, ROAD_W]} />
        <meshStandardMaterial color={PAL.road} roughness={1} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.012, s * (ROAD_W / 2 + 0.8)]} receiveShadow>
          <boxGeometry args={[len, 0.024, 1.6]} />
          <meshStandardMaterial color={PAL.shoulder} roughness={1} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`l${s}`} position={[0, 0.05, s * (ROAD_W / 2 - 0.45)]} receiveShadow>
          <boxGeometry args={[len, 0.03, 0.18]} />
          <meshStandardMaterial color={PAL.roadLine} roughness={0.9} />
        </mesh>
      ))}
      <primitive object={dashes} position={[-cx, 0, 0]} />
    </group>
  );
}
