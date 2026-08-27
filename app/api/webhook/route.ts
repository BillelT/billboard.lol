import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { brandColorFor } from "@/lib/palette";

// Stripe webhook: on a completed checkout, record the payment in Supabase.
// Realtime then pushes the new ranking to every open tab.
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
    const amount = (session.amount_total ?? 0) / 100;
    if (name && amount > 0) {
      const supabase = createClient(supaUrl, supaKey);

      const { data: cycle } = await supabase
        .from("cycles")
        .select("id")
        .order("starts_at", { ascending: false })
        .limit(1)
        .single();

      const { data: company } = await supabase
        .from("companies")
        .upsert(
          { name, url: `https://${name}`, color: brandColorFor(name) },
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
