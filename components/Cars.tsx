"use client";
import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { makeCarGeometry } from "@/lib/geometry";
import { PAL } from "@/lib/palette";
import type { SceneLayout } from "@/lib/layout";
import { vertexColorMat } from "./materials";

// Traffic in one InstancedMesh: per-car paint comes from instanceColor, which
// multiplies the white body while leaving the dark glass and tyres dark.
export default function Cars({ layout }: { layout: SceneLayout }) {
  const { mesh, lanes } = useMemo(() => {
    const count = PAL.carColors.length;
    const mesh = new THREE.InstancedMesh(makeCarGeometry(), vertexColorMat, count);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    const color = new THREE.Color();
    const lanes = PAL.carColors.map((hex, i) => {
      mesh.setColorAt(i, color.set(hex));
      const eastbound = i % 2 === 0;
      return { speed: 13 + (i % 3) * 3.5, offset: i * 137.7, dir: eastbound ? 1 : -1 };
    });
    return { mesh, lanes };
  }, []);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      mesh.dispose();
    },
    [mesh],
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const start = layout.startX - 120;
    const span = layout.endX + 120 - start;
    for (let i = 0; i < lanes.length; i++) {
      const { speed, offset, dir } = lanes[i];
      const d = (speed * t + offset) % span;
      dummy.position.set(dir > 0 ? start + d : start + span - d, 0, dir > 0 ? -2.2 : 2.2);
      dummy.rotation.set(0, dir > 0 ? 0 : Math.PI, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive object={mesh} />;
}
