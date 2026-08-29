"use client";
import { useEffect } from "react";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { ANCHOR_CATEGORIES, ANCHOR_CLICK_COUNTS, ANCHOR_DOMAINS, SEED, anchorClaimedAt } from "@/lib/seed";
import type { Billboard } from "@/lib/types";

interface SiteInfoResponse {
  domain: string;
  url: string;
  title: string | null;
  description: string | null;
  iconUrl: string | null;
  color: string;
  error?: string;
}

// The two placeholder slots at rank 1 / rank 2, overlaid with the real,
// live-fetched anchor domains instead of staying empty — used whenever there's
// no real ranking yet, whether that's because Supabase isn't configured at all
// or because it is and simply has no payments in it yet.
async function anchorSeed(): Promise<Billboard[]> {
  const anchors = await Promise.all(
    ANCHOR_DOMAINS.map((d) =>
      fetch(`/api/site-info?domain=${encodeURIComponent(d)}`)
        .then((r) => (r.ok ? (r.json() as Promise<SiteInfoResponse>) : null))
        .catch(() => null),
    ),
  );
  return SEED.map((b, i) => {
    const info = anchors[i];
    if (!info || info.error) return b;
    return {
      ...b,
      name: info.domain,
      url: info.url,
      color: info.color,
      title: info.title,
      description: info.description,
      iconUrl: info.iconUrl,
      category: ANCHOR_CATEGORIES[i],
      clickCount: ANCHOR_CLICK_COUNTS[i],
      claimedAt: anchorClaimedAt(i),
      placeholder: false,
    };
  });
}

// When Supabase is configured: load the current ranking and refetch on every new
// payment (realtime insert) so ranks re-sort live in the scene.
export default function DataSync() {
  const setBillboards = useStore((s) => s.setBillboards);

  useEffect(() => {
    const stress = Number(new URLSearchParams(window.location.search).get("stress"));
    if (Number.isFinite(stress) && stress > 0) {
      import("@/lib/seed").then(({ makeStressRanking }) =>
        setBillboards(makeStressRanking(Math.min(stress, 1000))),
      );
      return;
    }
    if (!supabaseConfigured()) {
      let cancelled = false;
      anchorSeed().then((seed) => {
        if (!cancelled) setBillboards(seed);
      });
      return () => {
        cancelled = true;
      };
    }

    let channel: { unsubscribe: () => void } | null = null;
    let cancelled = false;

    (async () => {
      const supabase = await getSupabase();
      if (!supabase || cancelled) return;

      const fetchRanking = async () => {
        const { data, error } = await supabase
          .from("current_ranking")
          .select(
            "id,name,url,color,icon_url,title,description,category,click_count,claimed_at,total_amount",
          )
          .order("total_amount", { ascending: false });
        if (!error && data && data.length > 0) {
          setBillboards(
            data.map(
              (r): Billboard => ({
                id: String(r.id),
                name: r.name,
                url: r.url,
                color: r.color,
                amount: Number(r.total_amount),
                title: r.title,
                description: r.description,
                iconUrl: r.icon_url,
                category: r.category,
                clickCount: r.click_count == null ? null : Number(r.click_count),
                claimedAt: r.claimed_at,
              }),
            ),
          );
        } else if (!cancelled) {
          // no real payments yet (or the query failed) — show the anchors
          // instead of an empty road.
          setBillboards(await anchorSeed());
        }
      };

      await fetchRanking();
      channel = supabase
        .channel("payments")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "payments" }, fetchRanking)
        .subscribe();
    })();

    return () => {
      cancelled = true;
      channel?.unsubscribe();
    };
  }, [setBillboards]);

  return null;
}
