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

// Segment counts are kept low on purpose: these are instanced hundreds of times,
// and smooth vertex normals keep the shading soft even on a coarse silhouette.
export function makeTreeGeometry(kind: "round" | "tall"): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  if (kind === "round") {
    parts.push(paint(place(new THREE.CylinderGeometry(0.16, 0.26, 1.6, 6), 0, 0.8, 0), PAL.trunk));
    parts.push(paint(place(new THREE.SphereGeometry(1.15, 9, 7), 0, 2.15, 0, 1, 1.05, 1), PAL.foliage));
    parts.push(paint(place(new THREE.SphereGeometry(0.62, 7, 5), 0.62, 2.6, 0.18), PAL.foliageLight));
  } else {
    parts.push(paint(place(new THREE.CylinderGeometry(0.13, 0.22, 2.3, 6), 0, 1.15, 0), PAL.trunk));
    parts.push(paint(place(new THREE.SphereGeometry(0.95, 9, 6), 0, 2.7, 0, 1, 1.15, 1), PAL.foliage));
    parts.push(paint(place(new THREE.SphereGeometry(0.7, 7, 5), 0, 3.7, 0), PAL.foliageLight));
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
  const geo = new THREE.SphereGeometry(0.55, 7, 5);
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

// Helicopter faces +X (the direction it flies).
export function makeHelicopterGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(paint(place(box(3.4, 1.7, 1.6), 0, 0, 0), PAL.heliBody));
  parts.push(paint(place(box(3.5, 0.42, 1.5), -0.1, 0.78, 0), PAL.heliRoof));
  parts.push(paint(place(box(1.1, 1.15, 1.3), 2.05, -0.16, 0), PAL.heliBody));
  parts.push(paint(place(box(0.85, 0.95, 1.36), 1.9, 0.3, 0), PAL.window));
  parts.push(paint(place(box(1.0, 0.75, 1.66), -0.4, 0.05, 0), PAL.window));
  // tail
  parts.push(paint(place(box(3.6, 0.44, 0.44), -3.3, 0.34, 0), PAL.heliBody));
  parts.push(paint(place(box(0.55, 1.25, 0.18), -4.9, 0.95, 0), PAL.heliBody));
  parts.push(paint(place(box(0.45, 0.14, 1.5), -4.5, 0.42, 0), PAL.heliRoof));
  // skids
  for (const sz of [0.68, -0.68]) {
    parts.push(paint(place(box(2.9, 0.14, 0.14), 0.2, -1.3, sz), PAL.heliDark));
    for (const sx of [0.95, -0.6]) {
      parts.push(paint(place(box(0.14, 0.62, 0.14), sx, -1.0, sz * 0.86), PAL.heliDark));
    }
  }
  // mast
  parts.push(paint(place(new THREE.CylinderGeometry(0.13, 0.16, 0.6, 6), 0, 1.15, 0), PAL.heliDark));
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

export function makeMainRotorGeometry(): THREE.BufferGeometry {
  const parts = [
    paint(place(new THREE.CylinderGeometry(0.22, 0.22, 0.22, 8), 0, 0, 0), PAL.heliDark),
    paint(place(box(8.2, 0.08, 0.38), 0, 0, 0), PAL.rotor),
    paint(place(box(0.38, 0.08, 8.2), 0, 0, 0), PAL.rotor),
  ];
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

export function makeTailRotorGeometry(): THREE.BufferGeometry {
  const parts = [
    paint(place(box(1.5, 0.06, 0.2), 0, 0, 0), PAL.rotor),
    paint(place(box(0.2, 0.06, 1.5), 0, 0, 0), PAL.rotor),
  ];
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

// Body left white so per-instance colour can tint it; glass and tyres stay dark
// through that multiply.
export function makeCarGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(paint(place(box(2.5, 0.62, 1.18), 0, 0.66, 0), "#ffffff"));
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

// Bird faces +X (the direction it flies); wings are separate meshes rooted at
// the body so they can flap on their own.
export function makeBirdBodyGeometry(): THREE.BufferGeometry {
  const parts = [
    paint(place(box(1.0, 0.26, 0.26), 0, 0, 0), PAL.bird),
    paint(place(box(0.34, 0.22, 0.22), 0.6, 0.05, 0), PAL.bird),
    paint(place(box(0.26, 0.09, 0.09), 0.85, 0.05, 0), PAL.birdBeak),
    paint(place(box(0.5, 0.08, 0.34), -0.66, 0.03, 0), PAL.bird),
  ];
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

// One swept-back wing, rooted at the origin and reaching along +Z, drawn as a
// flat quad plus its mirror so it stays visible from below.
export function makeBirdWingGeometry(): THREE.BufferGeometry {
  const quad = [
    [-0.34, 0, 0],
    [0.3, 0, 0],
    [-0.02, 0.02, 1.5],
    [-0.24, 0.02, 1.5],
  ] as const;
  const tris = [
    [0, 1, 2],
    [0, 2, 3],
  ];
  const pos: number[] = [];
  for (const [a, b, c] of tris) {
    for (const i of [a, b, c]) pos.push(...quad[i]);
    for (const i of [c, b, a]) pos.push(...quad[i]); // back face
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return paint(geo, PAL.bird);
}
