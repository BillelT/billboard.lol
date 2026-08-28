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


// Icosahedra come out non-indexed and cylinders indexed; mergeGeometries needs
// one or the other, so everything is flattened before merging. It also gives
// every prop hard per-face normals, which is the look we want anyway.
function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const merged = mergeGeometries(flat, false)!;
  flat.forEach((f, i) => {
    if (f !== parts[i]) f.dispose();
  });
  parts.forEach((p) => p.dispose());
  return merged;
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
  const midY = poleH + panelH / 2;

  const poleZ = -(tk / 2 + poleS / 2 + 0.02); // posts sit behind the panel
  if (panelW < 7.5) {
    parts.push(paint(place(box(poleS, poleTop, poleS), 0, poleTop / 2, poleZ), PAL.steelDark));
  } else {
    const px = panelW * 0.3;
    parts.push(paint(place(box(poleS, poleTop, poleS), -px, poleTop / 2, poleZ), PAL.steelDark));
    parts.push(paint(place(box(poleS, poleTop, poleS), px, poleTop / 2, poleZ), PAL.steelDark));
    // cross-brace tying the two posts together, well under the panel
    parts.push(
      paint(
        place(box(panelW * 0.6 + poleS, poleS * 0.55, poleS * 0.55), 0, poleH * 0.55, poleZ),
        PAL.steelDark,
      ),
    );
  }

  // panel body
  parts.push(paint(place(box(panelW, panelH, tk), 0, midY, 0), PAL.frame));

  // Raised frame around the face — four bars standing proud of the panel, which
  // is what gives the billboard its thick white border and a lit edge that
  // catches the sun instead of a flat card.
  const fw = Math.max(tk * 0.9, panelH * 0.045); // border thickness
  const fd = tk * 0.75; // how far it stands out
  const fz = tk / 2 + fd / 2;
  const outerW = panelW + fw * 0.6;
  for (const sy of [1, -1]) {
    parts.push(
      paint(place(box(outerW, fw, fd), 0, midY + sy * (panelH / 2 - fw / 2), fz), PAL.frame),
    );
  }
  for (const sx of [1, -1]) {
    parts.push(
      paint(
        place(box(fw, panelH - fw * 2, fd), sx * (panelW / 2 - fw / 2 + fw * 0.3), midY, fz),
        PAL.frame,
      ),
    );
  }

  // overhanging cap and matching sill, in the cooler steel tone
  parts.push(
    paint(place(box(panelW * 1.05, fw * 0.85, tk * 2.6), 0, poleH + panelH + fw * 0.35, tk * 0.5), PAL.steel),
  );
  parts.push(
    paint(place(box(panelW * 1.04, fw * 0.7, tk * 2.2), 0, poleH - fw * 0.3, tk * 0.4), PAL.steel),
  );
  if (panelH > 6) {
    // maintenance catwalk under the face
    parts.push(paint(place(box(panelW * 0.94, tk * 0.4, tk * 3), 0, poleH - tk, tk * 1.4), PAL.catwalk));
  }

  // Floodlights: the detail that sells the thing as a real roadside billboard.
  // Housings tilt back toward the face and sit on stems off the cap.
  const u = THREE.MathUtils.clamp(panelH * 0.062, 0.2, 1.3);
  const lampY = poleH + panelH + fw * 0.8;
  const lampCount = panelW < 7.5 ? 2 : 3;
  for (let i = 0; i < lampCount; i++) {
    const lx = panelW * (lampCount === 2 ? (i === 0 ? -0.24 : 0.24) : (i - 1) * 0.3);
    parts.push(paint(place(box(0.32, 1.5, 0.32), lx, lampY + u * 0.75, tk * 0.9, u), PAL.lamp));
    const arm = paint(place(box(0.3, 0.3, 2.1), lx, lampY + u * 1.5, tk * 0.9 + u * 0.75, u), PAL.lamp);
    parts.push(arm);
    const head = box(1.9, 0.8, 1.1);
    head.rotateX(0.55);
    parts.push(paint(place(head, lx, lampY + u * 1.35, tk * 0.9 + u * 1.75, u), PAL.lamp));
    // the lit face of the housing, aimed down at the panel
    const glass = box(1.6, 0.14, 0.85);
    glass.rotateX(0.55);
    parts.push(paint(place(glass, lx, lampY + u * 0.95, tk * 0.9 + u * 1.62, u), PAL.lampGlow));
  }

  return merge(parts);
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

// Segment counts are kept low on purpose: these are instanced hundreds of times.
// Foliage is faceted rather than smooth — flat facets catch the sun on one side
// and fall away on the other, which is where the low-poly read comes from.
export function makeTreeGeometry(kind: "round" | "tall" | "pine"): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const blob = (r: number, y: number, x = 0, z = 0, hex: string = PAL.foliage, sy = 1) => {
    const g = new THREE.IcosahedronGeometry(r, 1);
    jitterFacets(g, 0.16);
    return paint(place(g, x, y, z, 1, sy, 1), hex);
  };
  if (kind === "round") {
    parts.push(paint(place(new THREE.CylinderGeometry(0.16, 0.28, 1.7, 6), 0, 0.85, 0), PAL.trunk));
    parts.push(blob(1.15, 2.2, 0, 0, PAL.foliage, 1.05));
    parts.push(blob(0.66, 2.72, 0.6, 0.2, PAL.foliageLight));
    parts.push(blob(0.5, 1.95, -0.75, -0.2, PAL.foliageDark));
  } else if (kind === "tall") {
    parts.push(paint(place(new THREE.CylinderGeometry(0.13, 0.24, 2.4, 6), 0, 1.2, 0), PAL.trunk));
    parts.push(blob(0.95, 2.8, 0, 0, PAL.foliage, 1.2));
    parts.push(blob(0.72, 3.85, 0, 0, PAL.foliageLight));
    parts.push(blob(0.52, 2.35, 0.6, -0.3, PAL.foliageDark));
  } else {
    // conifer: three stacked cones, darkest at the base
    parts.push(paint(place(new THREE.CylinderGeometry(0.14, 0.22, 1.1, 5), 0, 0.55, 0), PAL.trunk));
    parts.push(paint(place(new THREE.ConeGeometry(1.15, 1.7, 7), 0, 1.55, 0), PAL.foliageDark));
    parts.push(paint(place(new THREE.ConeGeometry(0.92, 1.5, 7), 0, 2.5, 0), PAL.foliage));
    parts.push(paint(place(new THREE.ConeGeometry(0.62, 1.3, 7), 0, 3.4, 0), PAL.foliageLight));
  }
  return merge(parts);
}

export function makeRockGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 0);
  jitterFacets(geo, 0.22);
  geo.scale(1, 0.62, 0.85);
  geo.translate(0, 0.35, 0);
  return paint(geo, PAL.rock);
}

export function makeBushGeometry(): THREE.BufferGeometry {
  const parts = [
    (() => {
      const g = new THREE.IcosahedronGeometry(0.55, 1);
      jitterFacets(g, 0.18);
      return paint(place(g, 0, 0.4, 0, 1.15, 0.78, 1), PAL.bush);
    })(),
    (() => {
      const g = new THREE.IcosahedronGeometry(0.34, 1);
      jitterFacets(g, 0.18);
      return paint(place(g, 0.42, 0.32, 0.16), PAL.foliageLight);
    })(),
  ];
  return merge(parts);
}

// Tufts of tall grass — the small thing that stops props from looking pasted
// onto a flat green sheet. A handful of tapered blades leaning off-centre.
export function makeGrassTuftGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const blades = 5;
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2 + 0.6;
    const h = 0.5 + ((i * 37) % 10) / 22;
    const g = new THREE.CylinderGeometry(0.005, 0.05, h, 3);
    g.translate(0, h / 2, 0);
    g.rotateZ(Math.sin(a) * 0.34);
    g.rotateX(Math.cos(a) * 0.34);
    g.translate(Math.cos(a) * 0.09, 0, Math.sin(a) * 0.09);
    parts.push(paint(g, i % 2 ? PAL.grassBlade : PAL.grassBladeLight));
  }
  return merge(parts);
}

export function makePowerPoleGeometry(): THREE.BufferGeometry {
  return merge([
    paint(place(new THREE.CylinderGeometry(0.09, 0.15, 6.8, 6), 0, 3.4, 0), PAL.pole),
    paint(place(box(2.4, 0.16, 0.16), 0, 6.15, 0), PAL.pole),
    paint(place(box(0.5, 0.14, 0.14), 0, 5.6, 0), PAL.pole),
  ]);
}

// Wires are their own prop, and they do not cast: a hairline box throws a hard
// 55-unit shadow bar across the road, which is far louder than the wire itself.
// Poles land one per decor cell at a fixed spacing, so each carries the span
// that reaches the next one and the line reads as continuous.
export function makePowerWireGeometry(span: number): THREE.BufferGeometry {
  return merge(
    [-0.95, 0.95].map((wz) => paint(place(box(span, 0.03, 0.03), span / 2, 6.02, wz), PAL.wire)),
  );
}

// Clouds are faceted on purpose: the scene reads as folded paper, and a smooth
// sphere in the sky is the one thing that gives away that it is not.
export function makeCloudGeometry(): THREE.BufferGeometry {
  const blob = (x: number, y: number, z: number, s: number) => {
    const g = new THREE.IcosahedronGeometry(1, 1);
    jitterFacets(g, 0.12);
    return paint(place(g, x, y, z, s, s * 0.7, s * 0.9), "#ffffff");
  };
  const parts = [blob(0, 0, 0, 1.4), blob(1.35, 0.1, 0.25, 0.95), blob(-1.25, 0.05, -0.15, 0.9), blob(0.25, 0.55, 0, 0.95)];
  return merge(parts);
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
  return merge(parts);
}

export function makeMainRotorGeometry(): THREE.BufferGeometry {
  const parts = [
    paint(place(new THREE.CylinderGeometry(0.22, 0.22, 0.22, 8), 0, 0, 0), PAL.heliDark),
    paint(place(box(8.2, 0.08, 0.38), 0, 0, 0), PAL.rotor),
    paint(place(box(0.38, 0.08, 8.2), 0, 0, 0), PAL.rotor),
  ];
  return merge(parts);
}

export function makeTailRotorGeometry(): THREE.BufferGeometry {
  const parts = [
    paint(place(box(1.5, 0.06, 0.2), 0, 0, 0), PAL.rotor),
    paint(place(box(0.2, 0.06, 1.5), 0, 0, 0), PAL.rotor),
  ];
  return merge(parts);
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
  return merge(parts);
}

// A single soft blob, reused instanced for both the little poof of dust a car
// kicks up landing a bump and the bigger smoke/fire puffs of an explosion —
// tinted per-instance, so one geometry covers every colour it needs to be.
export function makePuffGeometry(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 0);
  jitterFacets(g, 0.3);
  return paint(g, "#ffffff");
}

// A single chunk of debris flung out when a car explodes, tinted per-instance.
export function makeShardGeometry(): THREE.BufferGeometry {
  return paint(new THREE.BoxGeometry(1, 1, 1), "#ffffff");
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
  return merge(parts);
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
