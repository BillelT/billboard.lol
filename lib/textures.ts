import * as THREE from "three";
import { fmtUSD } from "./layout";

// Topfloor-style ad face: brand color panel (picked from the site's favicon), the
// real favicon in a white tile + the domain and the site's own SEO line on the
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

// binary-search-free trim: for text that has to stay on one line
function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

// Word-wraps onto up to maxLines lines instead of clipping to one — the SEO
// description gets room to breathe before it's cut off. Whatever's left past
// the last line is folded into it and ellipsized there, same as a single-line
// clip would, so it never spills past maxW (and never into the rank/amount
// column, since callers pass the same maxW that keeps that column clear).
function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const all: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxW) {
      all.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) all.push(line);

  if (all.length <= maxLines) return all;
  const shown = all.slice(0, maxLines);
  shown[maxLines - 1] = ellipsize(
    ctx,
    `${shown[maxLines - 1]} ${all.slice(maxLines).join(" ")}`,
    maxW,
  );
  return shown;
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
  /** the site's real favicon, once it has loaded; monogram until then */
  icon?: HTMLImageElement | null;
  /** the site's own SEO copy */
  title?: string | null;
  description?: string | null;
  /** the category the buyer picked at checkout */
  category?: string | null;
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

  // favicon tile — the real icon of the domain, with the monogram as fallback.
  const tile = 200;
  const tx = 64;
  const ty = 150;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(tx, ty, tile, tile, 40);
  ctx.fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const icon = opts.icon;
  if (icon && icon.complete) {
    const pad = 28;
    const box = tile - pad * 2;
    const iw = icon.naturalWidth || box;
    const ih = icon.naturalHeight || box;
    const k = Math.min(box / iw, box / ih);
    const w = iw * k;
    const h = ih * k;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(tx, ty, tile, tile, 40);
    ctx.clip();
    ctx.drawImage(icon, tx + (tile - w) / 2, ty + (tile - h) / 2, w, h);
    ctx.restore();
  } else {
    ctx.fillStyle = opts.color;
    ctx.font = font(700, 125);
    ctx.fillText(opts.name.charAt(0).toUpperCase(), tx + tile / 2, ty + tile / 2 + 8);
  }

  // category pill — top-left, kept small: it's a label, not a headline
  if (opts.category) {
    const label = opts.category.toUpperCase();
    ctx.font = font(700, 24);
    const pillMaxW = LW - 128 - 160;
    const clipped = ellipsize(ctx, label, pillMaxW);
    const padX = 16;
    const pillH = 38;
    const pillW = ctx.measureText(clipped).width + padX * 2;
    const px = 64;
    const py = 42;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.roundRect(px, py, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(clipped, px + padX, py + pillH / 2 + 1);
  }

  // rank — top-right, same small scale as the category pill: the panel's own
  // size is what carries the hierarchy, this is just a label
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.font = font(700, 52);
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowOffsetY = 3;
  ctx.fillText(`#${opts.rank}`, LW - 64, 42 + 19);
  ctx.shadowColor = "transparent";

  // domain name — right of the favicon, same row. Fixed size: it never
  // shrinks to fit, a name too long is truncated with an ellipsis instead.
  const nameX = tx + tile + 44;
  const nameMaxW = LW - nameX - 48;
  ctx.font = font(700, 80);
  const displayName = ellipsize(ctx, opts.name, nameMaxW);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 4;
  ctx.fillText(displayName, nameX, ty + tile * 0.32);
  ctx.shadowColor = "transparent";

  // the site's own SEO line, under the name
  const tagline = opts.description ?? opts.title ?? "your ad, but bigger";
  ctx.font = font(400, 34);
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  const taglineLineH = 42;
  const taglineY = ty + tile * 0.68;
  const descriptionMaxW = LW - nameX - 48;
  for (const [i, line] of wrapLines(ctx, tagline, descriptionMaxW, 3).entries()) {
    ctx.fillText(line, nameX, taglineY + i * taglineLineH);
  }

  // price — moved down to the bottom, discreet but still legible, still white
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = font(700, 58);
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowOffsetY = 3;
  ctx.fillText(fmtUSD(opts.amount), LW - 64, LH - 46);
  ctx.shadowColor = "transparent";

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

// draws text with manual letter-spacing — canvas has no tracking property
function fillTracked(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, spacing: number) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  const align = ctx.textAlign;
  ctx.textAlign = "left";
  let x = cx - total / 2;
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], x, y);
    x += widths[i] + spacing;
  }
  ctx.textAlign = align;
}

// Empty-slot marker. An unclaimed spot is NOT a billboard: nothing is built
// there yet, so nothing is modelled — no panel, no posts, no steel. It's a
// dashed outline of the billboard that *could* stand there, drawn as a flat
// transparent overlay in the world. Panel and legs live on the same canvas so
// one quad carries the whole silhouette.
export interface PlaceholderPlan {
  texture: THREE.CanvasTexture;
  planeW: number;
  planeH: number;
  centerY: number;
}

export function makePlaceholderOutline(
  panelW: number,
  panelH: number,
  poleH: number,
): PlaceholderPlan {
  const pad = Math.max(0.6, panelH * 0.06); // room for the stroke itself
  const planeW = panelW + pad * 2;
  const planeH = poleH + panelH + pad * 2;

  const key = `slot|${panelW.toFixed(2)}|${panelH.toFixed(2)}|${poleH.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit) return { texture: hit, planeW, planeH, centerY: planeH / 2 - pad };

  // constant pixels-per-world-unit, so a dash is the same real size on every
  // slot whatever its rank
  const ppu = THREE.MathUtils.clamp(1600 / planeW, 24, 90);
  const W = Math.round(planeW * ppu);
  const H = Math.round(planeH * ppu);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const u = (n: number) => n * ppu; // world units -> canvas px

  const stroke = "#ffffff";
  ctx.strokeStyle = stroke;
  ctx.lineWidth = u(Math.max(0.14, panelH * 0.028));
  ctx.lineJoin = "miter";
  const dash = [u(panelH * 0.1), u(panelH * 0.062)];

  // panel — a faint wash inside the frame so the slot reads as a surface and
  // not just four floating lines
  const px = u(pad);
  const py = u(pad);
  const pw = u(panelW);
  const ph = u(panelH);
  ctx.fillStyle = "rgba(255,255,255,0.13)";
  ctx.fillRect(px, py, pw, ph);
  ctx.setLineDash(dash);
  ctx.strokeRect(px, py, pw, ph);

  // legs, straight down to the ground — same count rule as a built billboard
  const legTop = py + ph;
  const legBottom = H - u(pad);
  const legW = u(Math.max(0.5, panelW * 0.055));
  const legXs = panelW < 7.5 ? [0] : [-panelW * 0.3, panelW * 0.3];
  for (const lx of legXs) {
    const cx = px + pw / 2 + u(lx);
    ctx.strokeRect(cx - legW / 2, legTop, legW, legBottom - legTop);
  }
  ctx.setLineDash([]);

  // copy, sized off the panel so every slot reads the same at any rank
  const family = uiFont();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = stroke;
  const headline = "PLACE YOUR BILLBOARD HERE";
  let size = u(panelH * 0.15);
  const maxW = pw * 0.82;
  ctx.font = `800 ${size}px ${family}`;
  while (size > 8 && ctx.measureText(headline).width > maxW) {
    size *= 0.94;
    ctx.font = `800 ${size}px ${family}`;
  }
  ctx.fillText(headline, px + pw / 2, py + ph * 0.52);

  ctx.font = `600 ${size * 0.38}px ${family}`;
  fillTracked(ctx, "DRIVE PAST TO SEE IT", px + pw / 2, py + ph * 0.72, size * 0.06);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  trackTexture(key, tex);
  return { texture: tex, planeW, planeH, centerY: planeH / 2 - pad };
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
