import { NextResponse } from "next/server";
import { fetchIconBytes, normalizeDomain } from "@/lib/siteinfo.server";

export const runtime = "nodejs";

// Same-origin favicon proxy. The billboard face is painted into a canvas that is
// uploaded as a WebGL texture, and a cross-origin image would taint it.
export async function GET(req: Request) {
  const domain = normalizeDomain(new URL(req.url).searchParams.get("domain") ?? "");
  if (!domain) return NextResponse.json({ error: "Invalid domain" }, { status: 400 });

  const icon = await fetchIconBytes(domain);
  if (!icon) return NextResponse.json({ error: "No icon" }, { status: 404 });

  return new NextResponse(new Uint8Array(icon.bytes), {
    headers: {
      "content-type": icon.type,
      "cache-control": "public, max-age=86400, s-maxage=604800, immutable",
      "content-length": String(icon.bytes.length),
    },
  });
}
