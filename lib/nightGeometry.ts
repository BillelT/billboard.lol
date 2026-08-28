import * as THREE from "three";
import { paint, merge, place, box } from "./geometry";
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

  // lamps: one still burning, one dark and hanging crooked
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
    if (!dead) {
      const glass = box(1.6, 0.14, 0.85);
      glass.rotateX(0.55);
      parts.push(paint(place(glass, lx, lampY + u * 0.95, tk * 0.9 + u * 1.62, u), NIGHT.lampGlow));
    }
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
// than any one part.
export function makeCrowGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const body = box(0.6, 0.4, 0.86);
  body.rotateX(0.12);
  parts.push(paint(place(body, 0, 0.4, 0), NIGHT.crow));
  parts.push(paint(place(box(0.34, 0.32, 0.34), 0, 0.68, 0.38), NIGHT.crow));
  parts.push(paint(place(box(0.26, 0.1, 0.16), 0, 0.66, 0.6), NIGHT.crowBeak));
  const tail = box(0.46, 0.06, 0.48);
  tail.rotateX(-0.3);
  parts.push(paint(place(tail, 0, 0.3, -0.58), NIGHT.crow));
  for (const s of [1, -1]) {
    const wing = box(0.13, 0.36, 0.68);
    wing.rotateZ(s * 0.12);
    parts.push(paint(place(wing, s * 0.32, 0.44, -0.04), NIGHT.crow));
  }
  for (const s of [1, -1]) {
    parts.push(paint(place(box(0.06, 0.26, 0.06), s * 0.13, 0.13, 0.04), NIGHT.crowBeak));
  }
  return merge(parts);
}
