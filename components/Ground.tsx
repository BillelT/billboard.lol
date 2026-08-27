"use client";
import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { PAL } from "@/lib/palette";
import type { SceneLayout } from "@/lib/layout";

// Vertex-colored grass with gentle undulation away from the road strip.
export default function Ground({ layout }: { layout: SceneLayout }) {
  const geometry = useMemo(() => {
    const width = layout.endX - layout.startX + 900;
    const depth = 700;
    const geo = new THREE.PlaneGeometry(width, depth, Math.min(220, Math.round(width / 10)), 64);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const grass = new THREE.Color(PAL.grass);
    const light = new THREE.Color(PAL.grassLight);
    const dark = new THREE.Color(PAL.grassDark);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const away = THREE.MathUtils.smoothstep(Math.abs(z), 20, 90);
      const n1 = Math.sin(x * 0.045 + z * 0.06) + Math.sin(x * 0.013 - z * 0.021) * 1.6;
      pos.setY(i, away * n1 * 1.15 - 0.02);
      const t = Math.sin(x * 0.021 + z * 0.033) * 0.5 + Math.sin(x * 0.0043) * 0.5;
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
    <mesh
      geometry={geometry}
      position={[(layout.startX + layout.endX) / 2, 0, 0]}
      receiveShadow
    >
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
  );
}
