import * as THREE from "three";
import { fmtUSD } from "./layout";

// Topfloor-style ad face: brand color panel, white monogram tile + domain on the
// left, big #rank / $amount on the right. Drawn once per (billboard, amount).
const cache = new Map<string, THREE.CanvasTexture>();

function trackTexture(key: string, tex: THREE.CanvasTexture) {
  if (cache.size > 80) {
    const first = cache.keys().next().value as string;
    cache.get(first)?.dispose();
    cache.delete(first);
  }
  cache.set(key, tex);
}

// Same family the HUD uses (next/font generates the actual family name), so the
// billboard faces and the interface share one typeface.
function uiFont(): string {
  const stack =
    typeof document !== "undefined" ? getComputedStyle(document.body).fontFamily : "";
  return stack || 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
}

function shade(hex: string, f: number): string {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, f);
  return `#${c.getHexString()}`;
}

// The camera descends to match each billboard, so every panel fills a similar
// slice of the screen when you reach it: they all need the same resolution.
// Memory is kept flat by how few are painted at once (see TEXTURE_RANGE), not by
// shrinking the canvas.
export const FACE_RES = 1024;

export function makeFaceTexture(opts: {
  name: string;
  color: string;
  amount: number;
  rank: number;
  res: number;
}): THREE.CanvasTexture {
  const W = opts.res;
  const H = Math.round(W * 0.53);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  // draw in a fixed 1024-wide design space whatever the real resolution is
  const LW = 1024;
  const LH = LW * 0.53;
  ctx.scale(W / LW, H / LH);
  const family = uiFont();
  const font = (w: number, s: number) => `${w} ${s}px ${family}`;

  // background: subtle vertical ramp of the brand color + faint tile grid
  const bg = ctx.createLinearGradient(0, 0, 0, LH);
  bg.addColorStop(0, shade(opts.color, 0.06));
  bg.addColorStop(1, shade(opts.color, -0.05));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, LW, LH);
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
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
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 8;
  ctx.strokeRect(18, 18, LW - 36, LH - 36);

  // monogram tile
  const tile = 176;
  const tx = 72;
  const ty = LH / 2 - tile / 2;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(tx, ty, tile, tile, 40);
  ctx.fill();
  ctx.fillStyle = opts.color;
  ctx.font = font(700, 110);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.name.charAt(0).toUpperCase(), tx + tile / 2, ty + tile / 2 + 8);

  // domain name, auto-fit
  const nameX = tx + tile + 48;
  const nameMaxW = LW - nameX - 380;
  let size = 96;
  ctx.font = font(700, size);
  while (size > 34 && ctx.measureText(opts.name).width > nameMaxW) {
    size -= 4;
    ctx.font = font(700, size);
  }
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 4;
  ctx.fillText(opts.name, nameX, LH / 2 - 26);
  ctx.shadowColor = "transparent";
  ctx.font = font(400, 36);
  if (ctx.measureText("your ad, but bigger").width <= nameMaxW) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("your ad, but bigger", nameX, LH / 2 + 50);
  }

  // rank + amount on the right
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffffff";
  ctx.font = font(700, 120);
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowOffsetY = 5;
  ctx.fillText(`#${opts.rank}`, LW - 64, LH / 2 - 40);
  ctx.font = font(700, 84);
  ctx.fillText(fmtUSD(opts.amount), LW - 64, LH / 2 + 78);
  ctx.shadowColor = "transparent";

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

// Towed banner: white strip, red border, the current leader spelled out.
export function makeBannerTexture(text: string): THREE.CanvasTexture {
  const key = `banner|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const W = 1536;
  const H = 224;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#fdfdfb";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#e4572e";
  ctx.fillRect(0, 0, W, 16);
  ctx.fillRect(0, H - 16, W, 16);

  let size = 108;
  const family = uiFont();
  const fit = () => (ctx.font = `700 ${size}px ${family}`);
  fit();
  while (size > 40 && ctx.measureText(text).width > W - 120) {
    size -= 4;
    fit();
  }
  ctx.fillStyle = "#1f2733";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, H / 2 + 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  trackTexture(key, tex);
  return tex;
}
