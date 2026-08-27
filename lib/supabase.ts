"use client";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// Loaded on demand so supabase-js (and its realtime client) stays out of the
// initial bundle: in demo mode it is never downloaded at all.
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (client !== undefined) return client;
  if (!supabaseConfigured()) {
    client = null;
    return client;
  }
  const { createClient } = await import("@supabase/supabase-js");
  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}
