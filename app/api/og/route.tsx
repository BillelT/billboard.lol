import { ImageResponse } from "next/og";
import { unstable_cache } from "next/cache";
import { getRanking } from "@/lib/ranking.server";
import { renderPngScreenshot } from "@/lib/headlessBrowser.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// Same render as before (moved out of the opengraph-image.tsx file-metadata
// convention and into a plain route). That convention always serves the
// image at the exact same URL ("/opengraph-image"), so once Twitter/X has
// fetched and cached those image bytes once, it keeps reusing them — a
// fresh page-level canonical (see app/page.tsx) makes X re-scrape the HTML,
// but the <meta og:image> inside still points at that one unchanging image
// URL, so its own image cache never sees a reason to refetch. Serving from
// a URL that callers version themselves (?v=<leader>-<amount>, set in
// app/page.tsx's generateMetadata) means a new leader or a new price is a
// genuinely new image URL X has never cached.
const OG_RENDER_VERSION = process.env.VERCEL_GIT_COMMIT_SHA || "dev";
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
  if (process.env.OG_RENDER_SECRET) qs.set("key", process.env.OG_RENDER_SECRET);

  try {
    const png = await renderPngScreenshot(`${SITE_URL}/og-render?${qs.toString()}`);
    return png.toString("base64");
  } catch (err) {
    console.error("OG render failed", err);
    return null;
  }
}, ["og-billboard-render", OG_RENDER_VERSION]);

const size = { width: 1200, height: 630 };

function fallbackImage(text: string) {
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
        {text}
      </div>
    ),
    size,
  );
}

export async function GET() {
  const ranking = await getRanking();
  const leader = [...ranking].sort((a, b) => b.amount - a.amount)[0];

  if (!leader) return fallbackImage("Be the first billboard on the highway");

  const base64 = await renderLeaderOg(leader.id);
  if (!base64) return fallbackImage(leader.name);

  return new Response(Buffer.from(base64, "base64"), {
    headers: { "content-type": "image/png" },
  });
}
