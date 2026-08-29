import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getRanking } from "@/lib/ranking.server";
import { fetchIconBytes } from "@/lib/siteinfo.server";
import { fmtUSD } from "@/lib/layout";
import { PAL } from "@/lib/palette";

export const alt = "The current bidboard.lol podium";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 30;

// Nudges a hex color's HSL lightness — the same trick the billboard face
// texture uses to ramp its panel from a lighter top to a darker bottom.
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l2 = Math.min(1, Math.max(0, l + f));
  const c = (1 - Math.abs(2 * l2 - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l2 - c / 2;
  let [r2, g2, b2] = [0, 0, 0];
  if (h < 60) [r2, g2, b2] = [c, x, 0];
  else if (h < 120) [r2, g2, b2] = [x, c, 0];
  else if (h < 180) [r2, g2, b2] = [0, c, x];
  else if (h < 240) [r2, g2, b2] = [0, x, c];
  else if (h < 300) [r2, g2, b2] = [x, 0, c];
  else [r2, g2, b2] = [c, 0, x];
  const to255 = (v: number) => Math.round((v + m) * 255);
  return `#${[to255(r2), to255(g2), to255(b2)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// compact freshness label for the metadata row — "1d ago", not "1 day ago".
// Same rule the live billboard face texture uses (lib/textures.ts), duplicated
// here since this route runs server-side and that module is client-only.
function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// Word-wraps onto up to maxLines lines, using an average-character-width
// estimate instead of real text measurement — satori has no canvas to measure
// against server-side, and the file's own truncate() above takes the same
// shrink-to-fit-by-character-budget approach for the same reason.
function wrapByChars(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && test.length > maxChars) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (last.length > maxChars) lines[maxLines - 1] = `${last.slice(0, maxChars - 1).trimEnd()}…`;
  }
  return lines;
}

// hex -> "r,g,b" for building rgba() strings in gradients
function rgbTriplet(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

// soft dark blob, transparent at the edge — the same ground-contact shadow
// every prop in the 3D scene gets, so things planted in the grass read as
// standing on it instead of pasted over it
function GroundShadow({ width, height }: { width: number; height: number }) {
  return (
    <div
      style={{
        display: "flex",
        width,
        height,
        borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(20,40,15,0.4) 0%, rgba(20,40,15,0) 72%)",
      }}
    />
  );
}

// A low-poly pine, built the same way the CSS-only pieces of the UI are: plain
// boxes and triangles, no images.
function Pine({ left, bottom, scale }: { left: number; bottom: number; scale: number }) {
  const s = scale;
  return (
    <div
      style={{
        position: "absolute",
        left,
        bottom,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: `${17 * s}px solid transparent`,
          borderRight: `${17 * s}px solid transparent`,
          borderBottom: `${30 * s}px solid ${PAL.foliage}`,
        }}
      />
      <div
        style={{
          width: 0,
          height: 0,
          marginTop: -12 * s,
          borderLeft: `${22 * s}px solid transparent`,
          borderRight: `${22 * s}px solid transparent`,
          borderBottom: `${36 * s}px solid ${PAL.foliageDark}`,
        }}
      />
      <div style={{ display: "flex", width: 6 * s, height: 14 * s, background: PAL.trunk }} />
      <div style={{ display: "flex", marginTop: -8 * s }}>
        <GroundShadow width={30 * s} height={9 * s} />
      </div>
    </div>
  );
}

// Share card = the live podium. Regenerates as the ranking changes, so a link
// posted anywhere always shows who is currently on top.
export default async function Image() {
  const [ranking, bold] = await Promise.all([
    getRanking(),
    readFile(join(process.cwd(), "app/fonts/Outfit-Bold.ttf")),
  ]);
  const leader = [...ranking].sort((a, b) => b.amount - a.amount)[0];

  // real favicon bytes, inlined as a data URI — an http(s) src would work too,
  // but a failed fetch mid-render would take the whole image down with it, so
  // this goes through the same never-throws helper the icon proxy route uses
  // and falls back to the monogram tile on any miss.
  const iconBytes = leader ? await fetchIconBytes(leader.name).catch(() => null) : null;
  const iconDataUri = iconBytes
    ? `data:${iconBytes.type};base64,${Buffer.from(iconBytes.bytes).toString("base64")}`
    : null;

  // one big billboard now, so it gets to be the tile size that used to belong
  // to a leader sharing the frame with two smaller siblings
  const panelW = 620;
  const panelH = 340;
  const tile = 88;

  // JS-level truncation and shrink-to-fit sizing — reliable across renderers,
  // unlike relying on CSS text-overflow inside satori.
  const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  const contentW = panelW - 72; // panel width minus its own left/right padding
  const nameMaxW = contentW - tile - 20 - 90; // minus tile+gap, minus room for the rank badge
  const displayName = leader ? truncate(leader.name, 26) : "";
  const nameFont = leader ? Math.min(44, Math.floor(nameMaxW / (displayName.length * 0.56))) : 44;

  const descFont = 24;
  const descMaxChars = Math.max(10, Math.floor(contentW / (descFont * 0.52)));
  const descriptionLines = leader
    ? wrapByChars(leader.description ?? leader.title ?? "your ad, but bigger", descMaxChars, 3)
    : [];

  // pill width isn't measured, so the label is clipped to a character budget
  // up front (same shrink-to-fit approach as displayName/description above)
  // rather than left to wrap inside its flex column.
  const categoryFont = 15;
  const categoryMaxChars = Math.max(6, Math.floor((contentW * 0.32) / (categoryFont * 0.6)));
  const categoryLabel = leader?.category ? truncate(leader.category.toUpperCase(), categoryMaxChars) : null;

  const metaLeft = leader
    ? [leader.claimedAt ? timeAgo(leader.claimedAt) : null, leader.clickCount != null ? `${leader.clickCount.toLocaleString("en-US")} clicks` : null]
        .filter(Boolean)
        .join("  ·  ")
    : "";

  const pines = [
    { left: 30, bottom: 96, scale: 1.3 },
    { left: 92, bottom: 78, scale: 1.0 },
    { left: 154, bottom: 90, scale: 0.85 },
    { left: 1032, bottom: 88, scale: 1.05 },
    { left: 1096, bottom: 100, scale: 1.25 },
    { left: 1150, bottom: 76, scale: 0.8 },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `radial-gradient(ellipse 700px 500px at 82% -8%, rgba(255,246,214,0.85) 0%, rgba(255,246,214,0) 55%), linear-gradient(180deg, ${shade(PAL.skyTop, -0.05)} 0%, ${PAL.skyTop} 38%, ${PAL.skyHorizon} 68%)`,
          fontFamily: "Outfit",
          position: "relative",
        }}
      >
        {/* drifting clouds, same self-lit white as the 3D sky — kept clear of
            the header pills, which sit in the top ~110px on both edges */}
        <div
          style={{
            position: "absolute",
            display: "flex",
            left: 500,
            top: 54,
            width: 116,
            height: 38,
            background: "#ffffff",
            borderRadius: 999,
            opacity: 0.85,
          }}
        />
        <div
          style={{
            position: "absolute",
            display: "flex",
            left: 120,
            top: 132,
            width: 110,
            height: 36,
            background: "#ffffff",
            borderRadius: 999,
            opacity: 0.9,
          }}
        />
        <div
          style={{
            position: "absolute",
            display: "flex",
            left: 960,
            top: 116,
            width: 90,
            height: 32,
            background: "#ffffff",
            borderRadius: 999,
            opacity: 0.85,
          }}
        />

        {/* ground: grass with a treeline, then the road */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 1200,
            height: 172,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              flex: 1,
              // mowed-lawn stripes for real texture, plus a couple of soft
              // darker patches so the fill still reads as ground, not wallpaper
              background: `radial-gradient(ellipse 260px 100px at 12% 20%, rgba(${rgbTriplet(PAL.grassDark)},0.3) 0%, rgba(${rgbTriplet(PAL.grassDark)},0) 70%), radial-gradient(ellipse 300px 110px at 90% 65%, rgba(${rgbTriplet(PAL.grassDark)},0.26) 0%, rgba(${rgbTriplet(PAL.grassDark)},0) 70%), repeating-linear-gradient(70deg, rgba(${rgbTriplet(PAL.grassDark)},0.16) 0px, rgba(${rgbTriplet(PAL.grassDark)},0.16) 26px, rgba(255,255,255,0) 26px, rgba(255,255,255,0) 52px), linear-gradient(180deg, ${PAL.grassLight} 0%, ${PAL.grass} 100%)`,
            }}
          >
            {/* the road receding to the horizon, continuing the flat lane
                below up into the distance — the same driving-toward-it feel
                the real highway has, not a road painted flat on a card */}
            <div
              style={{
                position: "absolute",
                display: "flex",
                left: 0,
                top: 0,
                width: 1200,
                height: 121,
                background: `linear-gradient(180deg, ${shade(PAL.road, -0.1)} 0%, ${PAL.road} 100%)`,
                clipPath: "polygon(555px 0px, 645px 0px, 860px 121px, 340px 121px)",
              }}
            />
            {pines.map((p, i) => (
              <Pine key={i} {...p} />
            ))}
          </div>
          <div style={{ display: "flex", height: 5, background: PAL.shoulder }} />
          <div style={{ position: "relative", display: "flex", height: 46, background: PAL.road }}>
            <div
              style={{
                position: "absolute",
                display: "flex",
                top: 20,
                left: 0,
                width: "100%",
                justifyContent: "space-between",
                padding: "0 24px",
              }}
            >
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} style={{ display: "flex", width: 34, height: 6, background: PAL.roadLine }} />
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "40px 52px 0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255,255,255,0.9)",
              borderRadius: 999,
              padding: "14px 30px",
              fontSize: 34,
              fontWeight: 800,
              color: "#1f2733",
            }}
          >
            <div
              style={{
                display: "flex",
                width: 22,
                height: 22,
                marginRight: 14,
                borderRadius: 5,
                border: "2px solid #1f2733",
                background: `linear-gradient(${PAL.skyTop} 55%, #ffffff 55%)`,
              }}
            />
            bidboard.lol
          </div>
          <div
            style={{
              display: "flex",
              background: "#1f2733",
              color: "#fff",
              borderRadius: 999,
              padding: "14px 30px",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            {leader
              ? `Take #1 for ${fmtUSD(leader.amount + 1)}`
              : "Be the first on the highway"}
          </div>
        </div>

        {/* one dominant, centered billboard — #1's live name, tagline, rank
            and price, the same content the real billboard face shows */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
          {leader ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                transform: "rotate(-1.6deg)",
              }}
            >
              {/* floodlights, lit — the same warm glow they get on hover in
                  the real scene, cast down onto the cap below them. Plain
                  flex + negative margin to overlap, same trick the cap/panel
                  below already use — satori doesn't reliably center an
                  absolutely-positioned child via left:50%+transform. */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div
                  style={{
                    display: "flex",
                    width: panelW * 0.9,
                    height: 46,
                    borderRadius: "50%",
                    background: "radial-gradient(ellipse, rgba(255,246,221,0.6) 0%, rgba(255,246,221,0) 70%)",
                  }}
                />
                <div style={{ display: "flex", gap: panelW * 0.26, marginTop: -28, marginBottom: 6 }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{ display: "flex", width: 14, height: 20, borderRadius: 3, background: PAL.lamp }}
                    />
                  ))}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  width: panelW * 1.05,
                  height: 9,
                  background: `linear-gradient(180deg, ${PAL.steel} 0%, ${PAL.steelDark} 100%)`,
                  borderRadius: 3,
                  marginBottom: -3,
                }}
              />
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  width: panelW,
                  height: panelH,
                  background: `linear-gradient(180deg, ${shade(leader.color, 0.07)} 0%, ${shade(leader.color, -0.06)} 100%)`,
                  border: `8px solid ${PAL.frame}`,
                  borderRadius: 14,
                  boxShadow: "0 24px 50px rgba(31,39,51,0.28)",
                  padding: "28px 36px",
                  overflow: "hidden",
                }}
              >
                {/* glossy highlight, the glint a lit plastic panel catches */}
                <div
                  style={{
                    position: "absolute",
                    display: "flex",
                    inset: 0,
                    background:
                      "radial-gradient(circle at 22% 15%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 62%)",
                  }}
                />
                {/* header row: logo + domain on the left, rank top-right — same
                    layout the live billboard face texture paints */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: tile,
                        height: tile,
                        background: "#fff",
                        borderRadius: tile * 0.28,
                        overflow: "hidden",
                      }}
                    >
                      {iconDataUri ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={iconDataUri}
                          width={tile * 0.66}
                          height={tile * 0.66}
                          style={{ objectFit: "contain" }}
                        />
                      ) : (
                        <div style={{ display: "flex", color: leader.color, fontSize: tile * 0.58, fontWeight: 800 }}>
                          {leader.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", color: "#fff", fontSize: nameFont, fontWeight: 700, letterSpacing: -0.5 }}>
                      {displayName}
                    </div>
                  </div>
                  {/* leader is always the top of the sorted ranking, i.e. rank 1 */}
                  <div style={{ display: "flex", color: "#fff", fontSize: 46, fontWeight: 900 }}>#1</div>
                </div>

                {/* the site's own SEO copy, wrapped onto up to three lines */}
                <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
                  {descriptionLines.map((line, i) => (
                    <div
                      key={i}
                      style={{ display: "flex", color: "rgba(255,255,255,0.82)", fontSize: descFont, lineHeight: 1.4 }}
                    >
                      {line}
                    </div>
                  ))}
                </div>

                {/* bottom row: freshness+clicks / category pill / price, all on
                    the panel's bottom edge — same three-way split the live
                    billboard face draws */}
                <div style={{ display: "flex", alignItems: "center", marginTop: "auto" }}>
                  <div style={{ display: "flex", flex: 1, color: "rgba(255,255,255,0.8)", fontSize: 20 }}>
                    {metaLeft}
                  </div>
                  <div style={{ display: "flex", flex: 1, justifyContent: "center" }}>
                    {categoryLabel ? (
                      <div
                        style={{
                          display: "flex",
                          color: "#fff",
                          fontSize: categoryFont,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          background: "rgba(255,255,255,0.18)",
                          border: "2px solid rgba(255,255,255,0.4)",
                          borderRadius: 999,
                          padding: "8px 18px",
                        }}
                      >
                        {categoryLabel}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", flex: 1, justifyContent: "flex-end", color: "#fff", fontSize: 34, fontWeight: 800 }}>
                    {fmtUSD(leader.amount)}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: panelW * 0.34, height: 60 }}>
                {[0, 1].map((k) => (
                  <div key={k} style={{ display: "flex", width: 16, height: 60, background: PAL.steelDark }} />
                ))}
              </div>
              <div style={{ display: "flex", marginTop: -22 }}>
                <div
                  style={{
                    display: "flex",
                    width: panelW * 0.92,
                    height: 40,
                    borderRadius: "50%",
                    background: "radial-gradient(ellipse, rgba(15,30,10,0.5) 0%, rgba(15,30,10,0) 72%)",
                  }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", color: "#3d5240", fontSize: 34, fontWeight: 700 }}>
              Be the first billboard on the highway
            </div>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 0,
            width: 1200,
            display: "flex",
            justifyContent: "center",
            fontSize: 26,
            fontWeight: 700,
            color: "#ffffff",
            textShadow: "0 2px 6px rgba(0,0,0,0.35)",
          }}
        >
          pay more · get bigger · get seen first
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Outfit", data: bold, weight: 700, style: "normal" }] },
  );
}
