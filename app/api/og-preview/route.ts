import { NextRequest } from "next/server";
import { renderPngScreenshot } from "@/lib/headlessBrowser.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dev-only manual trigger for the real OG screenshot pipeline: renders
// /og-render with whatever query params you pass through the same headless
// Chromium path app/api/og/route.ts uses, but for any hand-built scene and
// with none of that route's per-leader caching. Lets the debug panel (and
// `curl localhost:3000/api/og-preview?...`) get an actual PNG on demand.
// Not for production: it launches a full browser per request, unauthenticated.
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new Response("only available in development", { status: 404 });
  }
  const qs = req.nextUrl.searchParams.toString();
  const png = await renderPngScreenshot(`${req.nextUrl.origin}/og-render?${qs}`);
  return new Response(new Uint8Array(png), { headers: { "content-type": "image/png" } });
}
