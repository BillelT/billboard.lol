"use client";
import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { PAL } from "@/lib/palette";
import { groundHeight, groundTint } from "@/lib/terrain";
import type { SceneLayout } from "@/lib/layout";

const DEPTH = 3600; // reaches far past the fog so the edge is never visible

// Vertex-colored grass. Tessellation is deliberately coarse: the undulation is
// low frequency, so a dense grid would only cost triangles.
export default function Ground({ layout }: { layout: SceneLayout }) {
  const geometry = useMemo(() => {
    const width = layout.endX - layout.startX + 1400;
    const segX = THREE.MathUtils.clamp(Math.round(width / 45), 20, 110);
    const geo = new THREE.PlaneGeometry(width, DEPTH, segX, 22);
    geo.rotateX(-Math.PI / 2);
    const cx = (layout.startX + layout.endX) / 2;
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const grass = new THREE.Color(PAL.grass);
    const light = new THREE.Color(PAL.grassLight);
    const dark = new THREE.Color(PAL.grassDark);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + cx;
      const z = pos.getZ(i);
      pos.setY(i, groundHeight(x, z));
      const t = groundTint(x, z);
      c.copy(grass).lerp(t > 0 ? light : dark, Math.abs(t) * 0.7);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [layout.startX, layout.endX]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} position={[(layout.startX + layout.endX) / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
  );
}
