"use client";
import { useEffect } from "react";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import type { Billboard } from "@/lib/types";

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
    if (!supabaseConfigured()) return;

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
