import "server-only";
import { dominantColor } from "./imagecolor.server";
import { brandColorFor } from "./palette";

// What a billboard actually shows: the real favicon of the domain, the SEO copy
// the site publishes about itself, and a background colour picked from the icon.
// Everything is read from the live site — nothing is typed in by the buyer.

export interface SiteInfo {
  domain: string;
  url: string;
  title: string | null;
  description: string | null;
  iconUrl: string | null;
  color: string;
  resolved: boolean; // false when the site could not be reached at all
}

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
const PRIVATE_TLDS = new Set(["local", "localhost", "internal", "intranet", "test", "example", "invalid", "home", "lan"]);

const UA = "Mozilla/5.0 (compatible; bidboard.lol/1.0; +https://bidboard.lol)";
const HTML_TIMEOUT = 6000;
const ICON_TIMEOUT = 5000;
const MAX_HTML = 512 * 1024;
const MAX_ICON = 1024 * 1024;
const TTL = 10 * 60 * 1000;

/** "HTTPS://Www.Foo.com/pricing?x=1" → "foo.com". null when it isn't a public domain. */
export function normalizeDomain(input: string): string | null {
  let d = String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.+$/, "");
  if (!d || d.length > 253 || !DOMAIN_RE.test(d)) return null;
  // no IP literals and no private/reserved suffixes: this is fetched server-side
  if (IPV4_RE.test(d)) return null;
  const tld = d.slice(d.lastIndexOf(".") + 1);
  if (PRIVATE_TLDS.has(tld) || tld.length < 2) return null;
  return d;
}

const cache = new Map<string, { at: number; info: SiteInfo }>();

async function get(url: string, timeout: number, maxBytes: number, accept: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": UA, accept },
      cache: "no-store",
    });
    if (!res.ok || !res.body) return null;
    const reader = res.body.getReader();
    const parts: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        break;
      }
    }
    const bytes = new Uint8Array(size > maxBytes ? maxBytes : size);
    let o = 0;
    for (const p of parts) {
      const room = bytes.length - o;
      if (room <= 0) break;
      bytes.set(p.subarray(0, room), o);
      o += Math.min(room, p.length);
    }
    return { bytes, type: res.headers.get("content-type") ?? "", url: res.url || url };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", mdash: "—", ndash: "–", hellip: "…",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
    const key = code.toLowerCase();
    if (ENTITIES[key]) return ENTITIES[key];
    if (key.startsWith("#x")) return String.fromCodePoint(parseInt(key.slice(2), 16) || 32);
    if (key.startsWith("#")) return String.fromCodePoint(parseInt(key.slice(1), 10) || 32);
    return m;
  });
}

function clean(s: string | null | undefined, max: number): string | null {
  if (!s) return null;
  const out = decodeEntities(s).replace(/\s+/g, " ").trim();
  if (!out) return null;
  return out.length > max ? `${out.slice(0, max - 1).trimEnd()}…` : out;
}

// Attribute soup, without a parser: pull every <meta>/<link> tag, then read the
// attributes we care about out of each one.
function tags(html: string, name: "meta" | "link"): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const re = new RegExp(`<${name}\\b[^>]*>`, "gi");
  for (const m of html.matchAll(re)) {
    const attrs: Record<string, string> = {};
    for (const a of m[0].matchAll(/([a-z0-9-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/gi)) {
      attrs[a[1].toLowerCase()] = a[3] ?? a[4] ?? a[5] ?? "";
    }
    out.push(attrs);
  }
  return out;
}

function metaContent(metas: Record<string, string>[], keys: string[]): string | null {
  for (const key of keys) {
    for (const m of metas) {
      const id = (m.property ?? m.name ?? m.itemprop ?? "").toLowerCase();
      if (id === key && m.content) return m.content;
    }
  }
  return null;
}

// bigger and more modern beats smaller and legacy — an apple-touch-icon is the
// closest thing most sites have to a logo file
function iconScore(rel: string, href: string, sizes: string): number {
  const ext = href.split(/[?#]/)[0].split(".").pop()?.toLowerCase() ?? "";
  let score = 0;
  if (rel.includes("apple-touch-icon")) score += 60;
  if (rel.includes("mask-icon")) score -= 40;
  if (ext === "png") score += 30;
  else if (ext === "svg") score += 22;
  else if (ext === "ico") score += 4;
  const px = Math.max(0, ...sizes.split(/\s+/).map((s) => parseInt(s, 10) || 0));
  score += Math.min(60, px / 4);
  return score;
}

function collectIcons(html: string, base: string): string[] {
  const found: { href: string; score: number }[] = [];
  for (const l of tags(html, "link")) {
    const rel = (l.rel ?? "").toLowerCase();
    if (!rel.includes("icon") || !l.href) continue;
    try {
      found.push({ href: new URL(decodeEntities(l.href), base).toString(), score: iconScore(rel, l.href, l.sizes ?? "") });
    } catch {
      /* unusable href */
    }
  }
  found.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  return found.map((f) => f.href).filter((h) => (seen.has(h) ? false : (seen.add(h), true)));
}

const googleIcon = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;

/**
 * Reads a domain's homepage: SEO title/description, the best favicon it
 * declares, and the dominant colour of that favicon. Falls back to the public
 * favicon service, then to a deterministic palette colour, so this never throws.
 */
export async function fetchSiteInfo(input: string): Promise<SiteInfo> {
  const domain = normalizeDomain(input);
  if (!domain) throw new Error("Invalid domain");

  const hit = cache.get(domain);
  if (hit && Date.now() - hit.at < TTL) return hit.info;

  const url = `https://${domain}`;
  const info: SiteInfo = {
    domain,
    url,
    title: null,
    description: null,
    iconUrl: null,
    color: brandColorFor(domain),
    resolved: false,
  };

  const page = (await get(url, HTML_TIMEOUT, MAX_HTML, "text/html,application/xhtml+xml")) ??
    (await get(`https://www.${domain}`, HTML_TIMEOUT, MAX_HTML, "text/html,application/xhtml+xml"));

  let themeColor: string | null = null;
  const candidates: string[] = [];

  if (page) {
    info.resolved = true;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(page.bytes);
    const metas = tags(html, "meta");
    const titleTag = /<title[^>]*>([\s\S]{0,400}?)<\/title>/i.exec(html)?.[1] ?? null;
    info.title = clean(metaContent(metas, ["og:title", "twitter:title"]) ?? titleTag, 120);
    info.description = clean(
      metaContent(metas, ["description", "og:description", "twitter:description"]),
      200,
    );
    const tc = metaContent(metas, ["theme-color", "msapplication-tilecolor"]);
    if (tc && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(tc.trim())) themeColor = tc.trim().toLowerCase();
    candidates.push(...collectIcons(html, page.url));
  }

  candidates.push(`${url}/favicon.ico`, googleIcon(domain));

  // walk the candidates until one gives us pixels we can read a colour from
  let displayIcon: string | null = null;
  let colorFromIcon = false;
  for (const href of candidates.slice(0, 4)) {
    const icon = await get(href, ICON_TIMEOUT, MAX_ICON, "image/*");
    if (!icon || icon.bytes.length < 64) continue;
    if (!displayIcon) displayIcon = href;
    const color = dominantColor(icon.bytes);
    if (color) {
      info.iconUrl = href;
      info.color = color;
      colorFromIcon = true;
      break;
    }
    // vector or exotic icon: keep it for display, read the colour elsewhere
    if (!info.iconUrl && /svg|image\//i.test(icon.type)) info.iconUrl = href;
  }

  if (!info.iconUrl && displayIcon) info.iconUrl = displayIcon;
  if (info.iconUrl && !colorFromIcon) {
    // the icon we show could not be decoded (SVG, BMP-in-ICO): read the colour
    // from the rasterised version of the same favicon
    const fallback = await get(googleIcon(domain), ICON_TIMEOUT, MAX_ICON, "image/*");
    const color = fallback ? dominantColor(fallback.bytes) : null;
    if (color) {
      info.color = color;
      colorFromIcon = true;
    } else if (themeColor) info.color = themeColor;
  } else if (!info.iconUrl && themeColor) {
    info.color = themeColor;
  }

  cache.set(domain, { at: Date.now(), info });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return info;
}

/** Fetches the bytes of a domain's favicon, for the same-origin icon proxy. */
export async function fetchIconBytes(
  domain: string,
): Promise<{ bytes: Uint8Array; type: string } | null> {
  const info = await fetchSiteInfo(domain);
  const href = info.iconUrl ?? googleIcon(info.domain);
  const icon = await get(href, ICON_TIMEOUT, MAX_ICON, "image/*");
  if (!icon || icon.bytes.length < 64) return null;
  const type = icon.type.split(";")[0].trim();
  return { bytes: icon.bytes, type: type.startsWith("image/") ? type : "image/png" };
}
