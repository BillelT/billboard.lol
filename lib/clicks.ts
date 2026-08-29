"use client";
import { getSupabase, supabaseConfigured } from "./supabase";

// Fire-and-forget: bumps a company's all-time click count when a tap on its
// billboard opens the url. Best-effort — a network hiccup here should never
// block the actual navigation, and an id that doesn't match a real company
// (the anchor placeholders, the seed's empty slots) just updates zero rows.
export function bumpClicks(companyId: string) {
  if (!supabaseConfigured()) return;
  getSupabase()
    .then((supabase) => supabase?.rpc("bump_company_clicks", { p_company_id: companyId }))
    .catch(() => {});
}
