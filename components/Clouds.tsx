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

  // The camera rig's last key rolls out past the final billboard looking
  // almost straight down the road at car height (see CameraRig.tsx) — a very
  // different gaze than the aerial/angled views over the billboards, and one
  // that needs its own low, close-to-the-horizon clouds rather than the
  // billboard-clearing altitudes below. HEAD/TAIL give clouds room on both
  // ends of the road so neither the opening nor this epilogue reads empty.
  const HEAD = 100;
  const TAIL = 260;

  const { mesh, base } = useMemo(() => {
    const rng = mulberry32(99);
    const span = layout.endX - layout.startX + HEAD + TAIL;
    // Density scales with the road length so far-out billboards still get sky cover,
    // without thickening the cluster the player already sees on arrival.
    const count = Math.max(16, Math.round(span / 22));
    // self-lit white so undersides never pick up the green ground bounce
    const cloudMat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      emissive: "#ffffff",
      emissiveIntensity: 0.55,
      roughness: 1,
    });
    const mesh = new THREE.InstancedMesh(makeCloudGeometry(), cloudMat, count);
    // Clouds must never cross a billboard face: they either drift well behind
    // the billboard line, or fly high enough to clear the tallest panel.
    const CLEARANCE = 18;
    const base = Array.from({ length: count }, () => {
      // Uniform spread across the whole road plus its head/tail margins, with a
      // little jitter so it doesn't read as a mechanical grid — organic, not
      // bunched at either end.
      const x = lerp(layout.startX - HEAD, layout.endX + TAIL, rng()) + lerp(-15, 15, rng());
      const s = lerp(2.2, 5.5, rng());
      let y: number, z: number;
      if (x > layout.endX + 20) {
        // Past the last billboard there's nothing to clear, so let clouds hang
        // low and near — what the end-of-road view actually flies past.
        z = lerp(-90, 40, rng());
        y = lerp(14, 42, rng());
      } else {
        const behind = rng() < 0.65;
        z = behind ? lerp(-260, BILL_Z - 45, rng()) : lerp(BILL_Z + 30, 60, rng());
        const floor = behind ? 30 : maxTop + CLEARANCE + s * 1.4;
        y = lerp(floor, floor + 34, rng());
      }
      return { x, y, z, s, speed: lerp(0.4, 1.1, rng()) };
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
    const span = layout.endX - layout.startX + HEAD + TAIL;
    for (let i = 0; i < base.length; i++) {
      const b = base[i];
      const x =
        layout.startX - HEAD + (((b.x + b.speed * t - layout.startX + HEAD) % span) + span) % span;
      dummy.position.set(x, b.y, b.z);
      dummy.scale.setScalar(b.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive ref={ref} object={mesh} />;
}
