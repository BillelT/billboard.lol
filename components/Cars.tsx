"use client";
import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { makeCarGeometry } from "@/lib/geometry";
import { PAL } from "@/lib/palette";
import type { SceneLayout } from "@/lib/layout";
import { vertexColorMat } from "./materials";

// A few cars looping down each lane.
export default function Cars({ layout }: { layout: SceneLayout }) {
  const group = useMemo(() => {
    const g = new THREE.Group();
    PAL.carColors.forEach((color, i) => {
      const mesh = new THREE.Mesh(makeCarGeometry(color), vertexColorMat);
      mesh.castShadow = true;
      const eastbound = i % 2 === 0;
      mesh.userData = {
        speed: 13 + (i % 3) * 3.5,
        offset: i * 137.7,
        dir: eastbound ? 1 : -1,
      };
      mesh.position.z = eastbound ? -2.2 : 2.2;
      mesh.rotation.y = eastbound ? 0 : Math.PI;
      g.add(mesh);
    });
    return g;
  }, []);

  useEffect(
    () => () => {
      group.children.forEach((c) => (c as THREE.Mesh).geometry.dispose());
    },
    [group],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const start = layout.startX - 120;
    const span = layout.endX + 120 - start;
    for (const car of group.children) {
      const { speed, offset, dir } = car.userData as { speed: number; offset: number; dir: number };
      const d = (speed * t + offset) % span;
      car.position.x = dir > 0 ? start + d : start + span - d;
    }
  });

  return <primitive object={group} />;
}
