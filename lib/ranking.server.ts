import "server-only";
import { ANCHOR_CATEGORIES, ANCHOR_DOMAINS, SEED } from "./seed";
import { fetchSiteInfo } from "./siteinfo.server";
import type { Billboard } from "./types";

interface Row {
  id: string;
  name: string;
  url: string;
  color: string;
  icon_url: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  total_amount: string | number;
}

// Overlays real, live-fetched site info onto the rank 1 / rank 2 placeholder
// slots (see ANCHOR_DOMAINS) so the fallback ranking never opens on a
// completely bare road. fetchSiteInfo never throws and caches itself, so a
// domain that's unreachable just leaves that slot as the plain placeholder.
async function withAnchors(seed: Billboard[]): Promise<Billboard[]> {
  const anchors = await Promise.all(ANCHOR_DOMAINS.map((d) => fetchSiteInfo(d).catch(() => null)));
  return seed.map((b, i) => {
    const info = anchors[i];
    if (!info) return b;
    return {
      ...b,
      name: info.domain,
      url: info.url,
      color: info.color,
      title: info.title,
      description: info.description,
      iconUrl: info.iconUrl,
      category: ANCHOR_CATEGORIES[i],
      placeholder: false,
    };
  });
}

// Server-side ranking for metadata and the OG image. Reads Supabase over REST
// (so the OG route stays dependency-free) and falls back to the seed ranking
// whenever Supabase isn't configured or is unreachable.
export async function getRanking(): Promise<Billboard[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return withAnchors(SEED);

  try {
    const res = await fetch(
      `${url}/rest/v1/current_ranking?select=id,name,url,color,icon_url,title,description,category,total_amount&order=total_amount.desc&limit=25`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        next: { revalidate: 30 },
      },
    );
    if (!res.ok) return withAnchors(SEED);
    const rows = (await res.json()) as Row[];
    if (!Array.isArray(rows) || rows.length === 0) return withAnchors(SEED);
    return rows.map((r) => ({
      id: String(r.id),
      name: r.name,
      url: r.url,
      color: r.color,
      amount: Number(r.total_amount),
      title: r.title,
      description: r.description,
      iconUrl: r.icon_url,
      category: r.category,
    }));
  } catch {
    return withAnchors(SEED);
  }
}
