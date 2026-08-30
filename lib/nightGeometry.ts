import * as THREE from "three";
import { paint, merge, place, box, jitterFacets } from "./geometry";
import { NIGHT } from "./nightPalette";

// A weathered cousin of makeBillboardGeometry (see geometry.ts): same frame
// language — posts, panel, raised border, cap, catwalk, lamp housings — but
// dark steel instead of daytime white, one lamp dead, one border bar bent
// loose, and a torn corner flap peeling off the face.
export function makeBrokenBillboardGeometry(
  panelW: number,
  panelH: number,
  poleH: number,
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const poleS = THREE.MathUtils.clamp(panelH * 0.085, 0.26, 1.9);
  const tk = THREE.MathUtils.clamp(panelH * 0.07, 0.2, 1.3);
  const poleTop = poleH + panelH * 0.45;
  const midY = poleH + panelH / 2;
  const poleZ = -(tk / 2 + poleS / 2 + 0.02);

  const px = panelW * 0.3;
  parts.push(paint(place(box(poleS, poleTop, poleS), -px, poleTop / 2, poleZ), NIGHT.steelDark));
  parts.push(paint(place(box(poleS, poleTop, poleS), px, poleTop / 2, poleZ), NIGHT.steelDark));
  parts.push(
    paint(
      place(box(panelW * 0.6 + poleS, poleS * 0.55, poleS * 0.55), 0, poleH * 0.55, poleZ),
      NIGHT.steelDark,
    ),
  );

  // panel body
  parts.push(paint(place(box(panelW, panelH, tk), 0, midY, 0), NIGHT.frame));

  const fw = Math.max(tk * 0.9, panelH * 0.045);
  const fd = tk * 0.75;
  const fz = tk / 2 + fd / 2;
  const outerW = panelW + fw * 0.6;

  // top border bar — sheared loose at one end, the detail that sells "broken"
  const topBar = box(outerW, fw, fd);
  topBar.rotateZ(-0.1);
  parts.push(
    paint(place(topBar, outerW * 0.07, midY + panelH / 2 - fw / 2 + 0.14, fz), NIGHT.rust),
  );
  parts.push(paint(place(box(outerW, fw, fd), 0, midY - (panelH / 2 - fw / 2), fz), NIGHT.frame));
  for (const sx of [1, -1]) {
    parts.push(
      paint(
        place(box(fw, panelH - fw * 2, fd), sx * (panelW / 2 - fw / 2 + fw * 0.3), midY, fz),
        NIGHT.frame,
      ),
    );
  }

  parts.push(
    paint(
      place(box(panelW * 1.05, fw * 0.85, tk * 2.6), 0, poleH + panelH + fw * 0.35, tk * 0.5),
      NIGHT.steel,
    ),
  );
  parts.push(
    paint(place(box(panelW * 1.04, fw * 0.7, tk * 2.2), 0, poleH - fw * 0.3, tk * 0.4), NIGHT.steel),
  );
  if (panelH > 6) {
    parts.push(
      paint(place(box(panelW * 0.94, tk * 0.4, tk * 3), 0, poleH - tk, tk * 1.4), NIGHT.catwalk),
    );
  }

  // lamps: both dead now — one hanging crooked, one just dark and unlit
  const u = THREE.MathUtils.clamp(panelH * 0.062, 0.2, 1.3);
  const lampY = poleH + panelH + fw * 0.8;
  const lampXs = [-panelW * 0.24, panelW * 0.24];
  lampXs.forEach((lx, i) => {
    const dead = i === 0;
    parts.push(paint(place(box(0.32, 1.5, 0.32), lx, lampY + u * 0.75, tk * 0.9, u), NIGHT.steelDark));
    const arm = box(0.3, 0.3, 2.1);
    if (dead) arm.rotateZ(0.14);
    parts.push(paint(place(arm, lx, lampY + u * 1.5, tk * 0.9 + u * 0.75, u), NIGHT.steelDark));
    const head = box(1.9, 0.8, 1.1);
    head.rotateX(dead ? 0.95 : 0.55);
    if (dead) head.rotateZ(0.16);
    parts.push(paint(place(head, lx, lampY + u * 1.35, tk * 0.9 + u * 1.75, u), NIGHT.steelDark));
  });

  // a torn corner flap, peeled back off the face
  const flap = box(panelW * 0.16, panelH * 0.15, tk * 0.3);
  flap.rotateZ(0.55);
  flap.rotateX(-0.4);
  parts.push(paint(place(flap, panelW * 0.4, midY + panelH * 0.38, tk * 0.55), NIGHT.rust));

  return merge(parts);
}

// A small, low-poly crow, folded and perched — one merged geometry, so the
// idle animation applied to it (see Night404Crow) sways the whole bird rather
// than any one part. Built from jittered blobs and tapered cones rather than
// bricks, so it reads as a feathered shape instead of a stack of boxes.
export function makeCrowGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  for (const s of [1, -1]) {
    const leg = new THREE.CylinderGeometry(0.022, 0.028, 0.22, 5);
    parts.push(paint(place(leg, s * 0.08, 0.11, 0.03), NIGHT.crowBeak));
  }

  // body: an elongated, jittered blob that tapers toward the tail instead of
  // a flat-sided box
  const body = new THREE.IcosahedronGeometry(0.4, 1);
  jitterFacets(body, 0.14);
  body.scale(0.6, 0.58, 1);
  body.rotateX(-0.2);
  parts.push(paint(place(body, 0, 0.46, -0.04), NIGHT.crow));

  const head = new THREE.IcosahedronGeometry(0.23, 1);
  jitterFacets(head, 0.12);
  parts.push(paint(place(head, 0, 0.74, 0.28), NIGHT.crow));

  // beak: an actual point, not a brick
  const beak = new THREE.ConeGeometry(0.075, 0.32, 5);
  beak.rotateX(Math.PI / 2);
  parts.push(paint(place(beak, 0, 0.71, 0.53), NIGHT.crowBeak));

  // tail: a flattened fan tapering to a point behind the body
  const tail = new THREE.ConeGeometry(0.28, 0.6, 5);
  tail.scale(1, 1, 0.32);
  tail.rotateX(-Math.PI / 2);
  parts.push(paint(place(tail, 0, 0.32, -0.6), NIGHT.crow));

  // wings folded flat along the body's sides, tapering to a point near the
  // tail rather than squared-off slabs
  for (const s of [1, -1]) {
    const wing = new THREE.ConeGeometry(0.2, 0.82, 5);
    wing.scale(0.5, 1, 1);
    wing.rotateZ(-Math.PI / 2);
    wing.rotateY(s * 0.1);
    parts.push(paint(place(wing, s * 0.22, 0.48, -0.06), NIGHT.crow));
  }

  return merge(parts);
}
