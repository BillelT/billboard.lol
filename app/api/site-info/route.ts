import { NextResponse } from "next/server";
import { fetchSiteInfo, normalizeDomain } from "@/lib/siteinfo.server";
import { iconSrc } from "@/lib/icons";

export const runtime = "nodejs";

// Live preview for the claim form: the real favicon, the site's own SEO copy and
// the colour picked from its icon — the exact billboard you are about to buy.
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("domain") ?? "";
  const domain = normalizeDomain(raw);
  if (!domain) {
    return NextResponse.json({ error: "Enter a valid domain, e.g. yourcompany.com" }, { status: 400 });
  }

  const info = await fetchSiteInfo(domain);
  return NextResponse.json(
    { ...info, icon: info.iconUrl ? iconSrc(domain) : null },
    {
      headers: {
        "cache-control": "public, max-age=60, s-maxage=600, stale-while-revalidate=86400",
      },
    },
  );
}
