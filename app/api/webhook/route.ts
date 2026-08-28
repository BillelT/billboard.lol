import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { fetchSiteInfo } from "@/lib/siteinfo.server";
import { isCategory } from "@/lib/categories";

export const runtime = "nodejs";

// Stripe webhook: on a completed checkout, enrich the domain (favicon, SEO copy,
// colour read off the icon) and record the payment in Supabase. Realtime then
// pushes the new ranking to every open tab.
export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !whSecret || !supaUrl || !supaKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 501 });
  }

  const stripe = new Stripe(key);
  const sig = req.headers.get("stripe-signature");
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig ?? "", whSecret);
  } catch {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const name = session.metadata?.name;
    const category = isCategory(session.metadata?.category) ? session.metadata.category : null;
    const amount = (session.amount_total ?? 0) / 100;
    if (name && amount > 0) {
      const supabase = createClient(supaUrl, supaKey);

      const { data: cycle } = await supabase
        .from("cycles")
        .select("id")
        .order("starts_at", { ascending: false })
        .limit(1)
        .single();

      // read the site again here rather than trusting anything the browser sent
      const info = await fetchSiteInfo(name).catch(() => null);

      const { data: company } = await supabase
        .from("companies")
        .upsert(
          {
            name,
            url: info?.url ?? `https://${name}`,
            color: info?.color ?? "#2f6bff",
            icon_url: info?.iconUrl ?? null,
            title: info?.title ?? null,
            description: info?.description ?? null,
            ...(category ? { category } : {}),
            enriched_at: new Date().toISOString(),
          },
          { onConflict: "name" },
        )
        .select("id")
        .single();

      if (cycle && company) {
        await supabase.from("payments").insert({
          company_id: company.id,
          cycle_id: cycle.id,
          amount,
          stripe_session_id: session.id,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
