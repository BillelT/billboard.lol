import { NextResponse } from "next/server";
import Stripe from "stripe";

const NAME_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

// Creates a Stripe Checkout session for a bid. Without STRIPE_SECRET_KEY the
// client falls back to demo mode (bid applied locally, no payment).
export async function POST(req: Request) {
  let body: { name?: unknown; amount?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim().toLowerCase();
  const amount = Math.round(Number(body.amount));
  if (!NAME_RE.test(name)) {
    return NextResponse.json({ error: "Enter a valid domain, e.g. yourcompany.com" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < 1 || amount > 100000) {
    return NextResponse.json({ error: "Amount must be between $1 and $100,000" }, { status: 400 });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ demo: true });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
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
            description: "Every dollar makes your billboard bigger. No refunds. Obviously.",
          },
        },
      },
    ],
    metadata: { name },
    success_url: `${site}/?planted=1`,
    cancel_url: site,
  });

  return NextResponse.json({ url: session.url });
}
