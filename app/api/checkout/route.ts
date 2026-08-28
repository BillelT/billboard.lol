import { NextResponse } from "next/server";
import Stripe from "stripe";
import { fetchSiteInfo, normalizeDomain } from "@/lib/siteinfo.server";
import { isCategory } from "@/lib/categories";

export const runtime = "nodejs";

// Every billboard is paid for. This route only ever hands back a Stripe Checkout
// URL — there is no path that plants a billboard without a completed payment
// (the webhook is what writes to the database).
export async function POST(req: Request) {
  let body: { name?: unknown; amount?: unknown; category?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = normalizeDomain(String(body.name ?? ""));
  const amount = Math.round(Number(body.amount));
  const category = isCategory(body.category) ? body.category : null;

  if (!name) {
    return NextResponse.json({ error: "Enter a valid domain, e.g. yourcompany.com" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < 1 || amount > 100000) {
    return NextResponse.json({ error: "Amount must be between $1 and $100,000" }, { status: 400 });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Payments are not configured on this deployment." },
      { status: 503 },
    );
  }

  // The billboard shows what the site publishes about itself, so a domain that
  // shows nothing at all is a typo, not a customer.
  const info = await fetchSiteInfo(name);
  if (!info.resolved && !info.iconUrl) {
    return NextResponse.json(
      { error: `We couldn't reach https://${name} — check the domain.` },
      { status: 422 },
    );
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const stripe = new Stripe(key);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amount * 100,
          product_data: {
            name: `Billboard for ${name}`,
            description:
              info.description ??
              info.title ??
              "Every dollar makes your billboard bigger. No refunds. Obviously.",
            // Stripe fetches this itself, so it has to be the site's own URL
            ...(info.iconUrl?.startsWith("https://") ? { images: [info.iconUrl] } : {}),
          },
        },
      },
    ],
    metadata: { name, ...(category ? { category } : {}) },
    success_url: `${site}/?planted=${encodeURIComponent(name)}`,
    cancel_url: `${site}/?cancelled=1`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
  }
  return NextResponse.json({ url: session.url });
}
