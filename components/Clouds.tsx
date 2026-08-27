"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { mulberry32, lerp } from "@/lib/rng";
import { makeCloudGeometry } from "@/lib/geometry";
import { BILL_Z, type SceneLayout } from "@/lib/layout";

// Drifting clouds, denser over the giant billboards where the camera flies.
// They cast the big soft ground shadows of the aerial section.
export default function Clouds({ layout }: { layout: SceneLayout }) {
  const ref = useRef<THREE.InstancedMesh>(null);

  const maxTop = useMemo(
    () => layout.items.reduce((m, it) => Math.max(m, it.totalH), 0),
    [layout.items],
  );

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
    // Clouds must never cross a billboard face: they either drift well behind
    // the billboard line, or fly high enough to clear the tallest panel.
    const CLEARANCE = 18;
    const base = Array.from({ length: count }, () => {
      const behind = rng() < 0.65;
      const s = lerp(2.2, 5.5, rng());
      const z = behind ? lerp(-260, BILL_Z - 45, rng()) : lerp(BILL_Z + 30, 60, rng());
      const floor = behind ? 30 : maxTop + CLEARANCE + s * 1.4;
      return {
        x: lerp(layout.startX - 60, layout.startX + span * 0.85, Math.pow(rng(), 1.4)),
        y: lerp(floor, floor + 34, rng()),
        z,
        s,
        speed: lerp(0.4, 1.1, rng()),
      };
    });
    mesh.castShadow = true;
    return { mesh, base };
  }, [layout.startX, layout.endX, maxTop]);

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
