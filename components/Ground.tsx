"use client";
import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { PAL } from "@/lib/palette";
import { groundHeight, groundRows, groundTint } from "@/lib/terrain";
import type { SceneLayout } from "@/lib/layout";

const COL_SPACING = 55;

// Vertex-colored grass on a non-uniform grid: rows are tight near the road,
// where props stand and the relief reads, and stretch out into the fog. That
// keeps the mesh faithful to groundHeight() (so nothing floats) for a fraction
// of the triangles a uniform grid of the same reach would cost.
export default function Ground({ layout }: { layout: SceneLayout }) {
  const geometry = useMemo(() => {
    const width = layout.endX - layout.startX + 1400;
    const cx = (layout.startX + layout.endX) / 2;
    const rows = groundRows();
    const colCount = THREE.MathUtils.clamp(Math.round(width / COL_SPACING), 24, 140);

    const cols: number[] = [];
    for (let i = 0; i <= colCount; i++) cols.push(-width / 2 + (width * i) / colCount);

    const positions = new Float32Array(rows.length * cols.length * 3);
    const colors = new Float32Array(rows.length * cols.length * 3);
    const c = new THREE.Color();
    const grass = new THREE.Color(PAL.grass);
    const light = new THREE.Color(PAL.grassLight);
    const dark = new THREE.Color(PAL.grassDark);

    let v = 0;
    for (const z of rows) {
      for (const localX of cols) {
        const x = localX + cx;
        positions[v * 3] = localX;
        positions[v * 3 + 1] = groundHeight(x, z);
        positions[v * 3 + 2] = z;
        const t = groundTint(x, z);
        c.copy(grass).lerp(t > 0 ? light : dark, Math.abs(t) * 0.7);
        colors[v * 3] = c.r;
        colors[v * 3 + 1] = c.g;
        colors[v * 3 + 2] = c.b;
        v++;
      }
    }

    const stride = cols.length;
    const indices: number[] = [];
    for (let r = 0; r < rows.length - 1; r++) {
      for (let i = 0; i < stride - 1; i++) {
        const a = r * stride + i;
        const b = a + 1;
        const d = (r + 1) * stride + i;
        const e = d + 1;
        indices.push(a, d, b, b, d, e);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setIndex(indices);
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
