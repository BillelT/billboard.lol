import * as THREE from "three";
import { mulberry32 } from "./rng";
import { NIGHT } from "./nightPalette";

// Same family the HUD uses (see lib/textures.ts) so the billboard face and the
// interface still share one typeface even at night.
function uiFont(): string {
  const stack = typeof document !== "undefined" ? getComputedStyle(document.body).fontFamily : "";
  return stack || 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
}

// The billboard face: black / yellow / white, worn and cracked, one big "404"
// and a button that is the whole point of the page. Drawn once — the panel
// never changes — so no cache is needed here unlike the ranked faces.
export function makeErrorFaceTexture(res = 1024): THREE.CanvasTexture {
  const W = res;
  const H = Math.round(W * 0.53);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const LW = 1024;
  const LH = LW * 0.53;
  ctx.scale(W / LW, H / LH);
  const family = uiFont();
  const font = (w: number, s: number) => `${w} ${s}px ${family}`;

  const bg = ctx.createLinearGradient(0, 0, 0, LH);
  bg.addColorStop(0, NIGHT.signPanel);
  bg.addColorStop(1, NIGHT.signPanelDark);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, LW, LH);

  // grime vignette
  const vg = ctx.createRadialGradient(LW * 0.5, LH * 0.55, LH * 0.1, LW * 0.5, LH * 0.55, LW * 0.6);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, LW, LH);

  // faint tile grid, same rhythm as the daytime faces, dimmer
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 3;
  for (let x = 128; x < LW; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, LH);
    ctx.stroke();
  }
  for (let y = 136; y < LH; y += 136) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(LW, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(242,194,48,0.32)";
  ctx.lineWidth = 8;
  ctx.strokeRect(18, 18, LW - 36, LH - 36);

  // scratches and scuffs, seeded so they stay put across rebuilds
  const rng = mulberry32(7);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 16; i++) {
    const x1 = rng() * LW;
    const y1 = rng() * LH;
    const len = 40 + rng() * 150;
    const ang = rng() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + Math.cos(ang) * len, y1 + Math.sin(ang) * len);
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = NIGHT.signWhite;
  ctx.font = font(800, 190);
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowOffsetY = 6;
  ctx.fillText("404", LW / 2, LH * 0.33);
  ctx.shadowColor = "transparent";

  ctx.fillStyle = NIGHT.signYellow;
  ctx.font = font(700, 54);
  ctx.fillText("error", LW / 2, LH * 0.49);

  ctx.fillStyle = "rgba(246,244,234,0.82)";
  ctx.font = font(500, 33);
  ctx.fillText("nothing to see here", LW / 2, LH * 0.585);

  // the button — the whole panel is clickable, but it reads as one here too
  const btnW = 300;
  const btnH = 62;
  const bx = LW / 2 - btnW / 2;
  const by = LH * 0.665;
  ctx.fillStyle = NIGHT.signYellow;
  ctx.beginPath();
  ctx.roundRect(bx, by, btnW, btnH, 12);
  ctx.fill();
  ctx.fillStyle = NIGHT.signInk;
  ctx.font = font(800, 29);
  ctx.fillText("click to go back", LW / 2, by + btnH / 2 + 2);

  // footer: a tiny sign glyph + the real address
  const fy = LH * 0.865;
  ctx.fillStyle = NIGHT.signYellow;
  ctx.beginPath();
  ctx.roundRect(LW / 2 - 96, fy - 11, 20, 20, 4);
  ctx.fill();
  ctx.fillStyle = "rgba(246,244,234,0.75)";
  ctx.font = font(600, 26);
  ctx.textAlign = "left";
  ctx.fillText("at bidboard.lol", LW / 2 - 64, fy + 1);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

// A cobweb anchored at the top-left of its own canvas, spread over the
// quarter-turn between "straight right" and "straight down" — mount it at any
// corner of the frame and rotate/mirror the plane to match.
export function makeSpiderwebTexture(res = 512): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = res;
  canvas.height = res;
  const ctx = canvas.getContext("2d")!;
  const cx = res * 0.05;
  const cy = res * 0.05;
  const rays = 6;
  const maxR = res * 1.3;
  const rng = mulberry32(11);

  ctx.strokeStyle = NIGHT.web;
  ctx.lineWidth = Math.max(1, res * 0.0032);
  ctx.lineCap = "round";

  const angles: number[] = [];
  for (let i = 0; i < rays; i++) {
    const a = (Math.PI / 2) * (i / (rays - 1)) + (rng() - 0.5) * 0.08;
    angles.push(a);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
    ctx.stroke();
  }

  const rings = 5;
  for (let r = 1; r <= rings; r++) {
    const rad = (r / rings) * maxR * 0.9;
    ctx.beginPath();
    for (let i = 0; i < angles.length; i++) {
      const jr = rad * (0.88 + rng() * 0.24);
      const x = cx + Math.cos(angles[i]) * jr;
      const y = cy + Math.sin(angles[i]) * jr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // a couple of loose, broken strands drifting off the web itself
  ctx.lineWidth = Math.max(1, res * 0.002);
  for (let i = 0; i < 2; i++) {
    const a = angles[Math.floor(rng() * angles.length)];
    const r0 = maxR * (0.4 + rng() * 0.3);
    const x0 = cx + Math.cos(a) * r0;
    const y0 = cy + Math.sin(a) * r0;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + (rng() - 0.5) * res * 0.2, y0 + res * (0.12 + rng() * 0.1));
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
