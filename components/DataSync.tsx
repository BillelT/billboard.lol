"use client";
import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import type { Billboard } from "@/lib/types";

// When Supabase is configured: load the current ranking and refetch on every new
// payment (realtime insert) so ranks re-sort live in the scene.
export default function DataSync() {
  const setBillboards = useStore((s) => s.setBillboards);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const fetchRanking = async () => {
      const { data, error } = await supabase
        .from("current_ranking")
        .select("id,name,url,color,total_amount")
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
            }),
          ),
        );
      }
    };

    fetchRanking();
    const channel = supabase
      .channel("payments")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "payments" }, fetchRanking)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [setBillboards]);

  return null;
}
