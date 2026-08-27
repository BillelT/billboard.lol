import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PAL } from "./palette";

// Every prop is a single merged, vertex-colored geometry: one material, one draw
// call per mesh (or per InstancedMesh for the scattered decor).

function paint(geo: THREE.BufferGeometry, hex: string): THREE.BufferGeometry {
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return geo;
}

function place(geo: THREE.BufferGeometry, x: number, y: number, z: number, s = 1, sy?: number, sz?: number) {
  geo.scale(s, sy ?? s, sz ?? s);
  geo.translate(x, y, z);
  return geo;
}

function box(w: number, h: number, d: number) {
  return new THREE.BoxGeometry(w, h, d);
}

export function makeBillboardGeometry(panelW: number, panelH: number, poleH: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const poleS = THREE.MathUtils.clamp(panelH * 0.085, 0.26, 1.9);
  const tk = THREE.MathUtils.clamp(panelH * 0.07, 0.2, 1.3);
  const poleTop = poleH + panelH * 0.45;

  const poleZ = -(tk / 2 + poleS / 2 + 0.02); // posts sit behind the panel
  if (panelW < 7.5) {
    parts.push(paint(place(box(poleS, poleTop, poleS), 0, poleTop / 2, poleZ), PAL.steelDark));
  } else {
    const px = panelW * 0.3;
    parts.push(paint(place(box(poleS, poleTop, poleS), -px, poleTop / 2, poleZ), PAL.steelDark));
    parts.push(paint(place(box(poleS, poleTop, poleS), px, poleTop / 2, poleZ), PAL.steelDark));
    parts.push(
      paint(
        place(box(panelW * 0.6 + poleS, poleS * 0.55, poleS * 0.55), 0, poleH * 0.55, poleZ),
        PAL.steelDark,
      ),
    );
  }
  // panel body + white frame lip
  parts.push(paint(place(box(panelW, panelH, tk), 0, poleH + panelH / 2, 0), PAL.frame));
  parts.push(
    paint(place(box(panelW * 1.03, tk * 0.9, tk * 1.5), 0, poleH + panelH + tk * 0.2, 0), PAL.steel),
  );
  parts.push(
    paint(place(box(panelW * 1.03, tk * 0.9, tk * 1.5), 0, poleH - tk * 0.2, 0), PAL.steel),
  );
  if (panelH > 6) {
    // maintenance catwalk under the face
    parts.push(paint(place(box(panelW * 0.94, tk * 0.4, tk * 3), 0, poleH - tk, tk * 1.4), PAL.catwalk));
  }
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

function jitterFacets(geo: THREE.BufferGeometry, amp: number) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    const f = (h - Math.floor(h) - 0.5) * amp;
    pos.setXYZ(i, x + x * f, y + y * f, z + z * f);
  }
  geo.computeVertexNormals();
  return geo;
}

export function makeTreeGeometry(kind: "round" | "tall"): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  if (kind === "round") {
    parts.push(paint(place(new THREE.CylinderGeometry(0.16, 0.26, 1.6, 7), 0, 0.8, 0), PAL.trunk));
    parts.push(paint(place(new THREE.SphereGeometry(1.15, 12, 9), 0, 2.15, 0, 1, 1.05, 1), PAL.foliage));
    parts.push(paint(place(new THREE.SphereGeometry(0.62, 10, 8), 0.62, 2.6, 0.18), PAL.foliageLight));
  } else {
    parts.push(paint(place(new THREE.CylinderGeometry(0.13, 0.22, 2.3, 7), 0, 1.15, 0), PAL.trunk));
    parts.push(paint(place(new THREE.SphereGeometry(0.95, 11, 8), 0, 2.7, 0, 1, 1.15, 1), PAL.foliage));
    parts.push(paint(place(new THREE.SphereGeometry(0.7, 10, 8), 0, 3.7, 0), PAL.foliageLight));
  }
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

export function makeRockGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 0);
  jitterFacets(geo, 0.22);
  geo.scale(1, 0.62, 0.85);
  geo.translate(0, 0.35, 0);
  return paint(geo, PAL.rock);
}

export function makeBushGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.55, 9, 7);
  geo.scale(1.15, 0.75, 1);
  geo.translate(0, 0.4, 0);
  return paint(geo, PAL.bush);
}

export function makePowerPoleGeometry(): THREE.BufferGeometry {
  const parts = [
    paint(place(new THREE.CylinderGeometry(0.09, 0.14, 6.6, 6), 0, 3.3, 0), PAL.pole),
    paint(place(box(2.3, 0.15, 0.15), 0, 5.95, 0), PAL.pole),
  ];
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

export function makeCloudGeometry(): THREE.BufferGeometry {
  const blob = (x: number, y: number, z: number, s: number) =>
    paint(place(new THREE.SphereGeometry(1, 10, 8), x, y, z, s, s * 0.72, s * 0.9), "#ffffff");
  const parts = [blob(0, 0, 0, 1.4), blob(1.35, 0.1, 0.25, 0.95), blob(-1.25, 0.05, -0.15, 0.9), blob(0.25, 0.55, 0, 0.95)];
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

export function makeCarGeometry(color: string): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(paint(place(box(2.5, 0.62, 1.18), 0, 0.66, 0), color));
  parts.push(paint(place(box(1.35, 0.55, 1.04), -0.12, 1.2, 0), PAL.window));
  const wheel = () => {
    const g = new THREE.CylinderGeometry(0.3, 0.3, 0.24, 8);
    g.rotateX(Math.PI / 2);
    return g;
  };
  for (const [wx, wz] of [[0.82, 0.62], [0.82, -0.62], [-0.82, 0.62], [-0.82, -0.62]] as const) {
    parts.push(paint(place(wheel(), wx, 0.3, wz), PAL.wheel));
  }
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}
