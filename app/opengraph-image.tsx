import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getRanking } from "@/lib/ranking.server";
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

  // one big billboard now, so it gets to be the tile size that used to belong
  // to a leader sharing the frame with two smaller siblings
  const panelW = 480;
  const panelH = 255;
  const tile = 82;

  // JS-level truncation and shrink-to-fit sizing — reliable across renderers,
  // unlike relying on CSS text-overflow inside satori. Same width budget
  // (panel minus the tile and its gaps) backs both the name and the tagline.
  const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  const nameMaxW = panelW - tile - 76;
  const displayName = leader ? truncate(leader.name, 24) : "";
  const nameFont = leader ? Math.min(46, Math.floor(nameMaxW / (displayName.length * 0.52))) : 46;
  const taglineMaxChars = Math.max(10, Math.floor(nameMaxW / (22 * 0.52)));
  const tagline = leader ? truncate(leader.description ?? leader.title ?? "your ad, but bigger", taglineMaxChars) : "";

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
          background: `linear-gradient(180deg, ${PAL.skyTop} 0%, ${PAL.skyHorizon} 62%)`,
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
              // a couple of soft darker patches break up the flat fill, the
              // same mottled look the real ground texture has
              background: `radial-gradient(ellipse 260px 100px at 12% 20%, rgba(${rgbTriplet(PAL.grassDark)},0.32) 0%, rgba(${rgbTriplet(PAL.grassDark)},0) 70%), radial-gradient(ellipse 300px 110px at 90% 65%, rgba(${rgbTriplet(PAL.grassDark)},0.28) 0%, rgba(${rgbTriplet(PAL.grassDark)},0) 70%), linear-gradient(180deg, ${PAL.grassLight} 0%, ${PAL.grass} 100%)`,
            }}
          >
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
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
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
                  justifyContent: "center",
                  width: panelW,
                  height: panelH,
                  background: `linear-gradient(180deg, ${shade(leader.color, 0.07)} 0%, ${shade(leader.color, -0.06)} 100%)`,
                  border: `8px solid ${PAL.frame}`,
                  borderRadius: 14,
                  boxShadow: "0 24px 50px rgba(31,39,51,0.28)",
                  padding: "0 30px",
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
                      color: leader.color,
                      fontSize: tile * 0.58,
                      fontWeight: 800,
                    }}
                  >
                    {leader.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", color: "#fff", fontSize: nameFont, letterSpacing: -0.5 }}>
                      {displayName}
                    </div>
                    <div style={{ display: "flex", color: "rgba(255,255,255,0.82)", fontSize: 22, marginTop: 6 }}>
                      {tagline}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginTop: 22,
                    color: "#fff",
                  }}
                >
                  <div style={{ display: "flex", fontSize: 58, fontWeight: 900 }}>#1</div>
                  <div style={{ display: "flex", fontSize: 50, fontWeight: 800 }}>{fmtUSD(leader.amount)}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: panelW * 0.34, height: 60 }}>
                {[0, 1].map((k) => (
                  <div key={k} style={{ display: "flex", width: 16, height: 60, background: PAL.steelDark }} />
                ))}
              </div>
              <div style={{ display: "flex", marginTop: -14 }}>
                <GroundShadow width={panelW * 0.62} height={26} />
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
            color: "#3d5240",
          }}
        >
          pay more · get bigger · get seen first
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Outfit", data: bold, weight: 700, style: "normal" }] },
  );
}
