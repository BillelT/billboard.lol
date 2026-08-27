"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { mulberry32, lerp } from "@/lib/rng";
import { groundHeight } from "@/lib/terrain";
import {
  makeTreeGeometry,
  makeRockGeometry,
  makeBushGeometry,
  makePowerPoleGeometry,
} from "@/lib/geometry";
import type { SceneLayout } from "@/lib/layout";
import { debugState } from "@/lib/debugState";
import { vertexColorMat } from "./materials";
import { useRebuild } from "./useRebuild";

const CHUNK = 55; // world units of road per decor cell
const BEHIND = 4;
const AHEAD = 16; // reaches the fog wall, so the world never visibly runs out
const CELLS = BEHIND + AHEAD + 1;
const MAX_DENSITY = 3; // instance pools are sized for the debug panel's ceiling

interface Kind {
  geometry: THREE.BufferGeometry;
  perCell: number;
  castShadow: boolean;
  place: (rng: () => number, x0: number, o: THREE.Object3D) => void;
}

// Decor is generated per cell around the camera instead of once across the whole
// road: instance counts stay constant whether the ranking holds 12 companies or
// 200, density never thins out, and positions are a pure function of the cell so
// scrolling back shows the same trees in the same places.
export default function Decor({ layout }: { layout: SceneLayout }) {
  const lastCell = useRef(Number.NaN);
  const rebuild = useRebuild();

  const { group, kinds, meshes } = useMemo(() => {
    const treeSpot = (rng: () => number, x0: number, o: THREE.Object3D) => {
      const x = x0 + rng() * CHUNK;
      // Most form a treeline just behind the billboards, which is the band the
      // ground-level camera actually sees between two panels; the rest add depth
      // further back, or sit on the near side of the road under the aerial
      // camera. Nothing goes between road and billboards, which would mask ads.
      const r = rng();
      const z =
        r < 0.45 ? lerp(-78, -26, rng()) : r < 0.72 ? lerp(-190, -78, rng()) : lerp(14, 85, rng());
      o.position.set(x, groundHeight(x, z), z);
      o.rotation.set(0, rng() * Math.PI * 2, 0);
      o.scale.setScalar(lerp(0.8, 2.1, rng()) * debugState.decor.treeScale);
    };
    const lowSpot = (min: number, max: number, sMin: number, sMax: number) =>
      (rng: () => number, x0: number, o: THREE.Object3D) => {
        const x = x0 + rng() * CHUNK;
        const z = (rng() < 0.5 ? -1 : 1) * lerp(min, max, rng());
        o.position.set(x, groundHeight(x, z), z);
        o.rotation.set(0, rng() * Math.PI * 2, 0);
        o.scale.setScalar(lerp(sMin, sMax, rng()));
      };

    const kinds: Kind[] = [
      { geometry: makeTreeGeometry("round"), perCell: 5, castShadow: true, place: treeSpot },
      { geometry: makeTreeGeometry("tall"), perCell: 3, castShadow: true, place: treeSpot },
      { geometry: makeRockGeometry(), perCell: 3, castShadow: true, place: lowSpot(9, 60, 0.35, 1.4) },
      { geometry: makeBushGeometry(), perCell: 4, castShadow: false, place: lowSpot(7.5, 70, 0.6, 1.8) },
      {
        geometry: makePowerPoleGeometry(),
        perCell: 1,
        castShadow: true,
        place: (_rng, x0, o) => {
          o.position.set(x0, groundHeight(x0, 7.8), 7.8);
          o.rotation.set(0, 0, 0);
          o.scale.setScalar(1);
        },
      },
    ];

    const group = new THREE.Group();
    const meshes = kinds.map((k) => {
      const mesh = new THREE.InstancedMesh(k.geometry, vertexColorMat, CELLS * k.perCell * MAX_DENSITY);
      mesh.castShadow = k.castShadow;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false; // the pool always straddles the camera
      group.add(mesh);
      return mesh;
    });

    return { group, kinds, meshes };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  const rebuildCells = useMemo(
    () => (centerCell: number) => {
      for (let ki = 0; ki < kinds.length; ki++) {
        const kind = kinds[ki];
        const mesh = meshes[ki];
        const perCell = Math.max(
          1,
          Math.round(kind.perCell * Math.min(MAX_DENSITY, debugState.decor.density)),
        );
        let n = 0;
        for (let c = centerCell - BEHIND; c <= centerCell + AHEAD; c++) {
          for (let slot = 0; slot < perCell; slot++) {
            // stable per (cell, kind, slot) so the world never reshuffles
            const seed = (c * 73856093) ^ (ki * 19349663) ^ (slot * 83492791);
            kind.place(mulberry32(seed >>> 0), c * CHUNK, dummy);
            dummy.updateMatrix();
            mesh.setMatrixAt(n++, dummy.matrix);
          }
        }
        mesh.count = n;
        mesh.instanceMatrix.needsUpdate = true;
      }
    },
    [kinds, meshes, dummy],
  );

  // seed the pool where the camera opens, and re-seed when a debug value moves
  useMemo(() => {
    const cell = Number.isNaN(lastCell.current)
      ? Math.floor(layout.startX / CHUNK)
      : lastCell.current;
    rebuildCells(cell);
  }, [rebuildCells, layout.startX, rebuild]);

  useEffect(
    () => () => {
      meshes.forEach((m) => {
        m.geometry.dispose();
        m.dispose();
      });
    },
    [meshes],
  );

  useFrame(({ camera }) => {
    const cell = Math.floor(camera.position.x / CHUNK);
    if (cell === lastCell.current) return;
    lastCell.current = cell;
    rebuildCells(cell);
  });

  return <primitive object={group} />;
}
