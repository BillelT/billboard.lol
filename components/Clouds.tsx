"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { mulberry32, lerp } from "@/lib/rng";
import { makeCloudGeometry } from "@/lib/geometry";
import type { SceneLayout } from "@/lib/layout";

// Drifting clouds, denser over the giant billboards where the camera flies.
// They cast the big soft ground shadows of the aerial section.
export default function Clouds({ layout }: { layout: SceneLayout }) {
  const ref = useRef<THREE.InstancedMesh>(null);

  const { mesh, base } = useMemo(() => {
    const rng = mulberry32(99);
    const count = 16;
    // self-lit white so undersides never pick up the green ground bounce
    const cloudMat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      emissive: "#ffffff",
      emissiveIntensity: 0.55,
      roughness: 1,
    });
    const mesh = new THREE.InstancedMesh(makeCloudGeometry(), cloudMat, count);
    const span = layout.endX - layout.startX;
    const base = Array.from({ length: count }, () => ({
      x: lerp(layout.startX - 60, layout.startX + span * 0.85, Math.pow(rng(), 1.4)),
      y: lerp(30, 72, rng()),
      z: lerp(-90, 40, rng()),
      s: lerp(2.2, 5.5, rng()),
      speed: lerp(0.4, 1.1, rng()),
    }));
    mesh.castShadow = true;
    return { mesh, base };
  }, [layout.startX, layout.endX]);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    },
    [mesh],
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const span = layout.endX - layout.startX + 200;
    for (let i = 0; i < base.length; i++) {
      const b = base[i];
      const x = layout.startX - 100 + (((b.x + b.speed * t - layout.startX + 100) % span) + span) % span;
      dummy.position.set(x, b.y, b.z);
      dummy.scale.setScalar(b.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive ref={ref} object={mesh} />;
}
