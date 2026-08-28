"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { makeBillboardGeometry } from "@/lib/geometry";
import { FACE_RES, getPlaceholderFaceTexture, makeFaceTexture } from "@/lib/textures";
import { getIcon } from "@/lib/icons";
import { BILL_Z, type LayoutItem, type SceneLayout } from "@/lib/layout";
import { interactionState } from "@/lib/interactionState";
import { vertexColorMat } from "./materials";

// How far ahead/behind the camera a billboard keeps a painted face. Beyond it
// the panel falls back to flat brand colour and its canvas is released, so the
// number of live textures depends on the view, not on the size of the ranking.
// Scaled by the panel's own size because the camera rides closer to small ones.
const textureRange = (panelW: number) => Math.max(150, panelW * 9);

function BillboardItem({ item }: { item: LayoutItem }) {
  const group = useRef<THREE.Group>(null);
  const face = useRef<THREE.MeshBasicMaterial>(null);
  const spawned = useRef(false);
  const painted = useRef<{ key: string; tex: THREE.CanvasTexture } | null>(null);

  const geometry = useMemo(
    () => makeBillboardGeometry(item.panelW, item.panelH, item.poleH),
    [item.panelW, item.panelH, item.poleH],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const faceKey = `${item.name}|${item.color}|${item.amount}|${item.rank}`;
  useEffect(
    () => () => {
      painted.current?.tex.dispose();
      painted.current = null;
    },
    [],
  );

  const tk = THREE.MathUtils.clamp(item.panelH * 0.07, 0.2, 1.3);

  useFrame(({ camera }, dt) => {
    const g = group.current;
    if (!g) return;

    // rank changes glide the billboard to its new spot; new ones pop in
    if (!spawned.current) {
      g.position.x = item.x;
      g.scale.setScalar(0.001);
      spawned.current = true;
    }
    g.position.x = THREE.MathUtils.damp(g.position.x, item.x, 2.5, dt);
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, 1, 3.2, dt));

    const mat = face.current;
    if (!mat) return;

    // empty slots share one static texture — no per-domain repaint, no disposal
    if (item.placeholder) {
      if (!mat.map) {
        mat.map = getPlaceholderFaceTexture(FACE_RES);
        mat.color.set("#ffffff");
        mat.needsUpdate = true;
      }
      return;
    }

    const near = Math.abs(camera.position.x - item.x) < textureRange(item.panelW);

    // asking for the icon starts its download; the face repaints once it lands.
    // Only domains the server actually found an icon for are ever requested.
    const icon = near && item.iconUrl ? getIcon(item.name) : null;
    const texKey = `${faceKey}|${icon ? "icon" : "mono"}`;

    if (near && painted.current?.key !== texKey) {
      painted.current?.tex.dispose();
      const tex = makeFaceTexture({
        name: item.name,
        color: item.color,
        amount: item.amount,
        rank: item.rank,
        res: FACE_RES,
        icon,
        title: item.title,
        description: item.description,
      });
      painted.current = { key: texKey, tex };
      mat.map = tex;
      mat.color.set("#ffffff");
      mat.needsUpdate = true;
    } else if (!near && painted.current) {
      painted.current.tex.dispose();
      painted.current = null;
      mat.map = null;
      mat.color.set(item.color);
      mat.needsUpdate = true;
    }
  });

  return (
    <group ref={group} position={[item.x, 0, BILL_Z]}>
      <mesh geometry={geometry} material={vertexColorMat} castShadow receiveShadow />
      <mesh position={[0, item.poleH + item.panelH / 2, tk / 2 + 0.03]}>
        <planeGeometry args={[item.panelW * 0.96, item.panelH * 0.92]} />
        <meshBasicMaterial ref={face} color={item.color} />
      </mesh>
    </group>
  );
}

export default function Billboards({ layout }: { layout: SceneLayout }) {
  // GrabNav hit-tests taps against this list — only empty slots are clickable,
  // and it only needs to change when the layout itself changes.
  useEffect(() => {
    interactionState.targets = layout.items
      .filter((it) => it.placeholder)
      .map((it) => ({
        rank: it.rank,
        amount: it.amount,
        x: it.x,
        panelW: it.panelW,
        panelH: it.panelH,
        poleH: it.poleH,
      }));
  }, [layout]);

  return (
    <>
      {layout.items.map((item) => (
        <BillboardItem key={item.id} item={item} />
      ))}
    </>
  );
}
