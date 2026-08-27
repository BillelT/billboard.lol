"use client";
import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { mulberry32, lerp } from "@/lib/rng";
import {
  makeTreeGeometry,
  makeRockGeometry,
  makeBushGeometry,
  makePowerPoleGeometry,
} from "@/lib/geometry";
import type { SceneLayout } from "@/lib/layout";
import { vertexColorMat } from "./materials";

// All static decor as a handful of InstancedMeshes. Trees stay behind the
// billboard line or far foreground so they never block the camera; only low
// props (rocks, bushes) sit near the road on the camera side.
export default function Decor({ layout }: { layout: SceneLayout }) {
  const group = useMemo(() => {
    const rng = mulberry32(1337);
    const g = new THREE.Group();
    const spanX = (pad: number) => lerp(layout.startX - pad, layout.endX + pad, rng());

    const scatter = (
      geo: THREE.BufferGeometry,
      count: number,
      placeFn: (d: THREE.Object3D) => void,
      castShadow = true,
    ) => {
      const mesh = new THREE.InstancedMesh(geo, vertexColorMat, count);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        placeFn(dummy);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      g.add(mesh);
      return mesh;
    };

    const treeSpot = (d: THREE.Object3D) => {
      // behind the billboards, or far foreground beyond the camera rail
      const behind = rng() < 0.72;
      d.position.set(spanX(120), 0, behind ? lerp(-140, -26, rng()) : lerp(95, 180, rng()));
      d.rotation.set(0, rng() * Math.PI * 2, 0);
      d.scale.setScalar(lerp(0.8, 2.1, rng()));
    };
    scatter(makeTreeGeometry("round"), 70, treeSpot);
    scatter(makeTreeGeometry("tall"), 45, treeSpot);

    scatter(makeRockGeometry(), 50, (d) => {
      const side = rng() < 0.5 ? -1 : 1;
      d.position.set(spanX(80), 0, side * lerp(9, 60, rng()));
      d.rotation.set(0, rng() * Math.PI * 2, 0);
      d.scale.setScalar(lerp(0.35, 1.4, rng()));
    });

    scatter(makeBushGeometry(), 80, (d) => {
      const side = rng() < 0.5 ? -1 : 1;
      d.position.set(spanX(100), 0, side * lerp(7.5, 70, rng()));
      d.rotation.set(0, rng() * Math.PI * 2, 0);
      d.scale.setScalar(lerp(0.6, 1.8, rng()));
    }, false);

    // power poles marching along the camera side of the road
    const poleGeo = makePowerPoleGeometry();
    const poleCount = Math.max(4, Math.floor((layout.endX - layout.startX) / 55));
    const poles = new THREE.InstancedMesh(poleGeo, vertexColorMat, poleCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < poleCount; i++) {
      dummy.position.set(layout.startX + i * 55, 0, 7.8);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);
    }
    poles.castShadow = true;
    g.add(poles);

    return g;
  }, [layout.startX, layout.endX]);

  useEffect(
    () => () => {
      group.children.forEach((c) => {
        const m = c as THREE.InstancedMesh;
        m.geometry.dispose();
        m.dispose();
      });
    },
    [group],
  );

  return <primitive object={group} />;
}
