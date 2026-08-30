import { ImageResponse } from "next/og";
import { unstable_cache } from "next/cache";
import { getRanking } from "@/lib/ranking.server";
import { renderPngScreenshot } from "@/lib/headlessBrowser.server";

export const alt = "The current bidboard.lol podium";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
// Never prerendered at build time (there's no browser to launch during a
// build) — always rendered on request, with the expensive part cached below.
export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// A real 3D screenshot of the current #1, not a flat CSS mock of one. Cached
// by the leader's own id, so the (expensive, headless-browser) render only
// happens again when a new company actually takes the top spot — never on a
// timer, and never for a click/amount tick from the same leader. Bump
// OG_RENDER_VERSION whenever the scene/composition changes so a deploy
// invalidates the cache for the current leader too, instead of waiting for
// the podium to change.
const OG_RENDER_VERSION = "v3";
const renderLeaderOg = unstable_cache(async (leaderId: string): Promise<string | null> => {
  const ranking = await getRanking();
  const leader = ranking.find((b) => b.id === leaderId);
  if (!leader) return null;

  const qs = new URLSearchParams({
    name: leader.name,
    color: leader.color,
    amount: String(leader.amount),
  });
  if (leader.description) qs.set("description", leader.description);
  else if (leader.title) qs.set("title", leader.title);
  if (leader.category) qs.set("category", leader.category);
  if (leader.clickCount != null) qs.set("clicks", String(leader.clickCount));
  if (leader.claimedAt) qs.set("claimedAt", leader.claimedAt);
  // /og-render is gated behind this same secret in production so it isn't
  // publicly browsable — see app/og-render/page.tsx.
  if (process.env.OG_RENDER_SECRET) qs.set("key", process.env.OG_RENDER_SECRET);

  try {
    const png = await renderPngScreenshot(`${SITE_URL}/og-render?${qs.toString()}`);
    return png.toString("base64");
  } catch (err) {
    // Falls back to the plain text card below rather than a broken/500 OG
    // image — most likely cause in production is OG_RENDER_SECRET not being
    // set, which makes /og-render 404 for this request too.
    console.error("OG render failed", err);
    return null;
  }
}, ["og-billboard-render", OG_RENDER_VERSION]);

export default async function Image() {
  const ranking = await getRanking();
  const leader = [...ranking].sort((a, b) => b.amount - a.amount)[0];

  if (!leader) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#cfe8f8",
            fontSize: 40,
            fontWeight: 700,
            color: "#1f2733",
          }}
        >
          Be the first billboard on the highway
        </div>
      ),
      size,
    );
  }

  const base64 = await renderLeaderOg(leader.id);
  if (!base64) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#cfe8f8",
            fontSize: 40,
            fontWeight: 700,
            color: "#1f2733",
          }}
        >
          {leader.name}
        </div>
      ),
      size,
    );
  }

  return new Response(Buffer.from(base64, "base64"), {
    headers: { "content-type": "image/png" },
  });
}
