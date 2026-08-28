"use client";
import { useEffect } from "react";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { ANCHOR_DOMAINS, SEED } from "@/lib/seed";
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
      // no backend: overlay the rank 1 / rank 2 placeholders with the real,
      // live-fetched anchor domains instead of leaving every slot empty.
      let cancelled = false;
      Promise.all(
        ANCHOR_DOMAINS.map((d) =>
          fetch(`/api/site-info?domain=${encodeURIComponent(d)}`)
            .then((r) => (r.ok ? (r.json() as Promise<SiteInfoResponse>) : null))
            .catch(() => null),
        ),
      ).then((anchors) => {
        if (cancelled || anchors.every((a) => !a)) return;
        setBillboards(
          SEED.map((b, i) => {
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
              placeholder: false,
            };
          }),
        );
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
          .select("id,name,url,color,icon_url,title,description,category,total_amount")
          .order("total_amount", { ascending: false });
        if (!error && data) {
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
              }),
            ),
          );
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
