import "server-only";
import { inflateSync } from "node:zlib";
import { relLuminance } from "./color";

// Dominant-colour extraction for favicons, with a dependency-free PNG decoder.
// A favicon is at most a couple hundred pixels wide, so a plain JS decode costs
// less than pulling an image library into the server bundle.

interface Bitmap {
  width: number;
  height: number;
  data: Uint8Array; // RGBA
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function isPng(buf: Uint8Array): boolean {
  return PNG_SIG.every((b, i) => buf[i] === b);
}

// Modern .ico files usually wrap a PNG. Anything else (real BMP frames) we skip
// rather than carry a second decoder: the caller falls back to another source.
export function pngInsideIco(buf: Uint8Array): Uint8Array | null {
  for (let i = 0; i + 8 < buf.length; i++) {
    if (buf[i] === 0x89 && isPng(buf.subarray(i))) return buf.subarray(i);
  }
  return null;
}

function decodePng(buf: Uint8Array): Bitmap | null {
  if (!isPng(buf)) return null;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let off = 8;
  let width = 0;
  let height = 0;
  let depth = 8;
  let colorType = 6;
  let interlace = 0;
  let palette: Uint8Array | null = null;
  let trns: Uint8Array | null = null;
  const idat: Uint8Array[] = [];

  while (off + 8 <= buf.length) {
    const len = view.getUint32(off);
    const type = String.fromCharCode(buf[off + 4], buf[off + 5], buf[off + 6], buf[off + 7]);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = view.getUint32(off + 8);
      height = view.getUint32(off + 12);
      depth = buf[off + 16];
      colorType = buf[off + 17];
      interlace = buf[off + 20];
    } else if (type === "PLTE") palette = data;
    else if (type === "tRNS") trns = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }

  // Interlaced or 16-bit-exotic files are rare enough for favicons to skip.
  if (!width || !height || interlace !== 0 || idat.length === 0) return null;
  if (width * height > 4_000_000) return null;

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType as 0 | 2 | 3 | 4 | 6];
  if (!channels) return null;

  let raw: Buffer;
  try {
    raw = inflateSync(Buffer.concat(idat.map((c) => Buffer.from(c))));
  } catch {
    return null;
  }

  const bitsPerPixel = channels * depth;
  const bpp = Math.max(1, bitsPerPixel >> 3); // filter unit, per the spec
  const stride = Math.ceil((width * bitsPerPixel) / 8);
  if (raw.length < (stride + 1) * height) return null;

  // undo the per-scanline filters in place
  const lines = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = lines.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? lines.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      let v = src[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }

  // raw channel value (palette index, or 0..2^depth-1 for sub-byte depths)
  const raw8 = (line: Uint8Array, index: number): number => {
    if (depth === 8) return line[index];
    if (depth === 16) return line[index * 2];
    const perByte = 8 / depth;
    const byte = line[Math.floor(index / perByte)];
    const shift = (perByte - 1 - (index % perByte)) * depth;
    return (byte >> shift) & ((1 << depth) - 1);
  };
  // same value scaled to 0..255, for the colour channels
  const sample = (line: Uint8Array, index: number): number =>
    depth < 8 ? raw8(line, index) * (255 / ((1 << depth) - 1)) : raw8(line, index);

  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const line = lines.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const i = x * channels;
      if (colorType === 3) {
        const idx = raw8(line, i);
        const p = idx * 3;
        out[o] = palette ? palette[p] : 0;
        out[o + 1] = palette ? palette[p + 1] : 0;
        out[o + 2] = palette ? palette[p + 2] : 0;
        out[o + 3] = trns && idx < trns.length ? trns[idx] : 255;
      } else if (colorType === 0 || colorType === 4) {
        const g = sample(line, i);
        out[o] = out[o + 1] = out[o + 2] = g;
        out[o + 3] = colorType === 4 ? sample(line, i + 1) : 255;
      } else {
        out[o] = sample(line, i);
        out[o + 1] = sample(line, i + 1);
        out[o + 2] = sample(line, i + 2);
        out[o + 3] = colorType === 6 ? sample(line, i + 3) : 255;
      }
    }
  }

  return { width, height, data: out };
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * v)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// The billboard face carries white text over this colour, so the extracted hue is
// kept as-is and only its saturation and lightness move — first into a plausible
// signage band, then down until white text clears ~3.4:1 (yellows need it most).
function readable(h: number, s: number, l: number): string {
  s = Math.max(0.4, Math.min(0.95, s));
  l = Math.max(0.3, Math.min(0.6, l));
  let hex = hslToHex(h, s, l);
  while (l > 0.22 && relLuminance(hex) > 0.259) {
    l -= 0.02;
    hex = hslToHex(h, s, l);
  }
  return hex;
}

/**
 * The colour a favicon "reads as": the dominant saturated hue, normalised so
 * white text stays legible on it. Monochrome icons return a dark slate.
 * Returns null when the image cannot be decoded.
 */
export function dominantColor(bytes: Uint8Array): string | null {
  const png = isPng(bytes) ? bytes : pngInsideIco(bytes);
  if (!png) return null;
  const bmp = decodePng(png);
  if (!bmp) return null;

  const BUCKETS = 24;
  const weight = new Float64Array(BUCKETS);
  const sumS = new Float64Array(BUCKETS);
  const sumL = new Float64Array(BUCKETS);
  const sumX = new Float64Array(BUCKETS);
  const sumY = new Float64Array(BUCKETS);
  let grayL = 0;
  let grayN = 0;
  let sampledN = 0;
  let transparentN = 0;

  // stride-sample so a 512px apple-touch-icon costs the same as a 32px favicon
  const step = Math.max(1, Math.floor(Math.sqrt((bmp.width * bmp.height) / 16384)));
  for (let y = 0; y < bmp.height; y += step) {
    for (let x = 0; x < bmp.width; x += step) {
      const o = (y * bmp.width + x) * 4;
      const a = bmp.data[o + 3];
      sampledN++;
      if (a < 128) {
        transparentN++;
        continue;
      }
      const [h, s, l] = rgbToHsl(bmp.data[o], bmp.data[o + 1], bmp.data[o + 2]);
      if (s < 0.16 || l > 0.94 || l < 0.06) {
        // near-white is background; everything else feeds the monochrome fallback
        if (l <= 0.9) {
          grayL += l;
          grayN++;
        }
        continue;
      }
      const b = Math.min(BUCKETS - 1, Math.floor(h * BUCKETS));
      // saturated, mid-lightness pixels describe a brand better than pale ones
      const w = s * (1 - Math.abs(l - 0.5));
      weight[b] += w;
      sumS[b] += s * w;
      sumL[b] += l * w;
      sumX[b] += Math.cos(h * Math.PI * 2) * w;
      sumY[b] += Math.sin(h * Math.PI * 2) * w;
    }
  }

  let best = -1;
  let bestW = 0;
  for (let i = 0; i < BUCKETS; i++) {
    if (weight[i] > bestW) {
      bestW = weight[i];
      best = i;
    }
  }

  if (best < 0) {
    if (!grayN) return null;
    // a favicon that's mostly transparent is a mark meant to float on
    // whatever's behind it (usually a white site) — a dark slate would be
    // reading a colour into an icon that never had one, so go light instead
    if (sampledN > 0 && transparentN / sampledN > 0.5) {
      return hslToHex(0.61, 0.08, 0.94);
    }
    // opaque black/white logo: a dark neutral slate, the same hue family as the UI
    const l = grayL / grayN;
    return hslToHex(0.61, 0.14, Math.max(0.24, Math.min(0.34, l * 0.5 + 0.16)));
  }

  const w = weight[best];
  let h = Math.atan2(sumY[best] / w, sumX[best] / w) / (Math.PI * 2);
  if (h < 0) h += 1;
  return readable(h, sumS[best] / w, sumL[best] / w);
}
