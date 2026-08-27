import * as THREE from "three";
import { fmtUSD } from "./layout";

// Topfloor-style ad face: brand color panel, white monogram tile + domain on the
// left, big #rank / $amount on the right. Drawn once per (billboard, amount).
const cache = new Map<string, THREE.CanvasTexture>();

function shade(hex: string, f: number): string {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, f);
  return `#${c.getHexString()}`;
}

export function makeFaceTexture(opts: {
  name: string;
  color: string;
  amount: number;
  rank: number;
}): THREE.CanvasTexture {
  const key = `${opts.name}|${opts.color}|${opts.amount}|${opts.rank}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const W = 1024;
  const H = 544;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const font = (w: number, s: number) =>
    `${w} ${s}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

  // background: subtle vertical ramp of the brand color + faint tile grid
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, shade(opts.color, 0.06));
  bg.addColorStop(1, shade(opts.color, -0.05));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 3;
  for (let x = 128; x < W; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 136; y < H; y += 136) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  // inner border
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 8;
  ctx.strokeRect(18, 18, W - 36, H - 36);

  // monogram tile
  const tile = 176;
  const tx = 72;
  const ty = H / 2 - tile / 2;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(tx, ty, tile, tile, 40);
  ctx.fill();
  ctx.fillStyle = opts.color;
  ctx.font = font(800, 110);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.name.charAt(0).toUpperCase(), tx + tile / 2, ty + tile / 2 + 8);

  // domain name, auto-fit
  const nameX = tx + tile + 48;
  const nameMaxW = W - nameX - 380;
  let size = 96;
  ctx.font = font(800, size);
  while (size > 34 && ctx.measureText(opts.name).width > nameMaxW) {
    size -= 4;
    ctx.font = font(800, size);
  }
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 4;
  ctx.fillText(opts.name, nameX, H / 2 - 26);
  ctx.shadowColor = "transparent";
  ctx.font = font(600, 36);
  if (ctx.measureText("your ad, but bigger").width <= nameMaxW) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("your ad, but bigger", nameX, H / 2 + 50);
  }

  // rank + amount on the right
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffffff";
  ctx.font = font(900, 120);
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowOffsetY = 5;
  ctx.fillText(`#${opts.rank}`, W - 64, H / 2 - 40);
  ctx.font = font(800, 84);
  ctx.fillText(fmtUSD(opts.amount), W - 64, H / 2 + 78);
  ctx.shadowColor = "transparent";

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;

  if (cache.size > 80) {
    const first = cache.keys().next().value as string;
    cache.get(first)?.dispose();
    cache.delete(first);
  }
  cache.set(key, tex);
  return tex;
}
