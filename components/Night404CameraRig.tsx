"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";

// No scroll, no drive: this page is one static shot of the billboard, framed
// with the same maths CameraRig.tsx uses per-billboard. A slow sway plus a
// little mouse parallax keeps it from feeling like a frozen screenshot.
const BASE_POS = new THREE.Vector3(-3.1, 13.2, 28.5);
const BASE_LOOK = new THREE.Vector3(2.6, 5.4, -10);

export default function Night404CameraRig() {
  const pointer = useRef({ x: 0, y: 0 });
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    pos.copy(BASE_POS);
    pos.x += Math.sin(t * 0.11) * 0.4 + pointer.current.x * 1.1;
    pos.y += Math.sin(t * 0.08) * 0.22 - pointer.current.y * 0.55;
    camera.position.copy(pos);
    look.copy(BASE_LOOK);
    look.x += pointer.current.x * 0.55;
    camera.lookAt(look);
  });

  return null;
}
