import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getRanking } from "@/lib/ranking.server";
import { fmtUSD } from "@/lib/layout";
import { PAL } from "@/lib/palette";

export const alt = "The current OutGrow.lol podium";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 30;

// Share card = the live podium. Regenerates as the ranking changes, so a link
// posted anywhere always shows who is currently on top.
export default async function Image() {
  const [ranking, bold] = await Promise.all([
    getRanking(),
    readFile(join(process.cwd(), "app/fonts/Outfit-Bold.ttf")),
  ]);
  const podium = [...ranking].sort((a, b) => b.amount - a.amount).slice(0, 3);
  const leader = podium[0];
  const sizes = [
    { w: 470, h: 264, name: 46, num: 62, tile: 78 },
    { w: 300, h: 169, name: 31, num: 41, tile: 52 },
    { w: 232, h: 130, name: 25, num: 33, tile: 42 },
  ];
  // shrink the domain until it fits next to the monogram tile
  const nameSize = (name: string, s: (typeof sizes)[number]) =>
    Math.min(s.name, Math.floor((s.w - s.tile - 76) / (name.length * 0.52)));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `linear-gradient(180deg, ${PAL.skyTop} 0%, ${PAL.skyHorizon} 62%)`,
          fontFamily: "Outfit",
          position: "relative",
        }}
      >
        {/* ground */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 1200,
            height: 168,
            display: "flex",
            background: `linear-gradient(180deg, ${PAL.grassLight} 0%, ${PAL.grass} 100%)`,
          }}
        />

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
              background: "rgba(255,255,255,0.9)",
              borderRadius: 999,
              padding: "14px 30px",
              fontSize: 34,
              fontWeight: 800,
              color: "#1f2733",
            }}
          >
            OutGrow.lol
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

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: 30,
            padding: "0 52px 96px",
          }}
        >
          {podium.map((b, i) => {
            const s = sizes[i];
            return (
              <div key={b.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    width: s.w,
                    height: s.h,
                    background: b.color,
                    border: "7px solid #ffffff",
                    borderRadius: 12,
                    boxShadow: "0 18px 40px rgba(31,39,51,0.22)",
                    padding: "0 22px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: s.tile,
                        height: s.tile,
                        background: "#fff",
                        borderRadius: s.tile * 0.28,
                        color: b.color,
                        fontSize: s.tile * 0.6,
                        fontWeight: 800,
                      }}
                    >
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        color: "#fff",
                        fontSize: nameSize(b.name, s),
                        letterSpacing: -0.5,
                      }}
                    >
                      {b.name.length > 22 ? `${b.name.slice(0, 21)}…` : b.name}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      marginTop: 14,
                      color: "#fff",
                    }}
                  >
                    <div style={{ display: "flex", fontSize: s.num, fontWeight: 900 }}>#{i + 1}</div>
                    <div style={{ display: "flex", fontSize: s.num * 0.85, fontWeight: 800 }}>
                      {fmtUSD(b.amount)}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: s.w * 0.34, height: 54 }}>
                  {[0, 1].map((k) => (
                    <div key={k} style={{ display: "flex", width: 13, height: 54, background: "#d7dce1" }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 34,
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
