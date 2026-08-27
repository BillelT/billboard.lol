"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { makeBillboardGeometry } from "@/lib/geometry";
import { makeFaceTexture } from "@/lib/textures";
import { BILL_Z, type LayoutItem, type SceneLayout } from "@/lib/layout";
import { vertexColorMat } from "./materials";

function BillboardItem({ item }: { item: LayoutItem }) {
  const group = useRef<THREE.Group>(null);
  const spawned = useRef(false);

  const geometry = useMemo(
    () => makeBillboardGeometry(item.panelW, item.panelH, item.poleH),
    [item.panelW, item.panelH, item.poleH],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const texture = useMemo(
    () => makeFaceTexture({ name: item.name, color: item.color, amount: item.amount, rank: item.rank }),
    [item.name, item.color, item.amount, item.rank],
  );

  const tk = THREE.MathUtils.clamp(item.panelH * 0.07, 0.2, 1.3);

  // Rank changes glide the billboard to its new spot; new billboards pop in.
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    if (!spawned.current) {
      g.position.x = item.x;
      g.scale.setScalar(0.001);
      spawned.current = true;
    }
    g.position.x = THREE.MathUtils.damp(g.position.x, item.x, 2.5, dt);
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, 1, 3.2, dt));
  });

  return (
    <group ref={group} position={[item.x, 0, BILL_Z]}>
      <mesh geometry={geometry} material={vertexColorMat} castShadow receiveShadow />
      <mesh position={[0, item.poleH + item.panelH / 2, tk / 2 + 0.03]}>
        <planeGeometry args={[item.panelW * 0.96, item.panelH * 0.92]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </group>
  );
}

export default function Billboards({ layout }: { layout: SceneLayout }) {
  return (
    <>
      {layout.items.map((item) => (
        <BillboardItem key={item.id} item={item} />
      ))}
    </>
  );
}
