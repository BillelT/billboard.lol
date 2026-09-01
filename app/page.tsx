import type { Metadata } from "next";
import Experience from "@/components/Experience";
import Overlay from "@/components/Overlay";
import GrabNav from "@/components/GrabNav";
import DataSync from "@/components/DataSync";
import BuyModal from "@/components/BuyModal";
import { getRanking } from "@/lib/ranking.server";
import { fmtUSD } from "@/lib/layout";

export const revalidate = 30;

// The title carries the current leader, so the link itself is part of the game.
//
// The root layout pins canonical/og:url to a bare "/" for every request,
// which is correct for SEO (query-string variants of the homepage shouldn't
// be indexed as separate pages) but has a side effect: Twitter/X's card
// crawler keys its cache off that same canonical URL, so it keeps serving
// whatever it first scraped there — no query string on the shared link can
// ever bust it, since the page always tells crawlers "the real URL is just
// /". When a query string is present, treat it as a deliberate cache-bust
// request and let the canonical/og:url reflect it, so re-sharing the link
// with a new value (e.g. bid-board.lol/?refresh=2) actually reaches Twitter
// as a URL it hasn't cached before.
//
// The image itself needs the same treatment, separately: og:image always
// pointed at the one unchanging "/opengraph-image" URL, so even once X
// re-scraped the HTML above it would still reuse whatever bytes it had
// already cached for that image URL. /api/og is now versioned by leader id
// + amount, so a new leader or a new price is an image URL X has never seen.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) qs.append(key, v);
  }
  const url = qs.size > 0 ? `/?${qs.toString()}` : "/";

  const ranking = await getRanking();
  const leader = [...ranking].sort((a, b) => b.amount - a.amount)[0];
  const image = {
    url: `/api/og?v=${leader ? `${leader.id}-${leader.amount}` : "empty"}`,
    width: 1200,
    height: 630,
    alt: "The current bidboard.lol podium",
  };
  if (!leader) {
    return { alternates: { canonical: url }, openGraph: { url, images: [image] }, twitter: { images: [image] } };
  }
  const title = `Currently #1: ${leader.name} — bidboard.lol`;
  const description = `${leader.name} paid ${fmtUSD(leader.amount)} for the biggest billboard on bidboard.lol's highway. Outbid them for ${fmtUSD(leader.amount + 1)} and take #1.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: "website", url, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

// Honest disambiguation, not impersonation: bidboard.lol is its own site, but
// people searching the trending "outbid.lol" pay-to-rank format land here too
// and deserve a straight answer about what this is and isn't.
const faq = [
  {
    q: "What is bidboard.lol?",
    a: "bidboard.lol is a live pay-to-outbid leaderboard: companies bid real money to plant a billboard on a 3D American highway, and whoever has paid the most holds the #1 spot until someone outbids them.",
  },
  {
    q: "How does the ranking work?",
    a: "Rank is decided purely by the dollar amount paid. Outbid the current leader by at least $1 to take the top spot — anyone can be outbid back at any time, so the leaderboard never really settles.",
  },
  {
    q: "Is bidboard.lol the same site as outbid.lol?",
    a: "No. bidboard.lol is an independent pay-to-outbid billboard site and isn't affiliated with outbid.lol, outbids.lol, outbid-lol.com, or any other similarly named pay-to-rank leaderboard.",
  },
  {
    q: "How much does it cost to get the top spot?",
    a: "Whatever it takes to beat the current leader by at least $1 — the live price is shown on the homepage and rises every time someone gets outbid.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function Page() {
  return (
    <main>
      {/* The road is a WebGL scene, so this is the only text crawlers and
          screen readers get about what the page actually is. */}
      <p className="sr-only">
        bidboard.lol is a live, paid ranking where companies bid to plant a billboard on a 3D
        American highway. Outbid the current leader and take the biggest, most visible spot on
        the road — see who&apos;s #1 right now and how much it cost them.
      </p>
      <section className="sr-only" aria-label="Frequently asked questions">
        <dl>
          {faq.map(({ q, a }) => (
            <div key={q}>
              <dt>{q}</dt>
              <dd>{a}</dd>
            </div>
          ))}
        </dl>
      </section>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Experience />
      <GrabNav />
      <Overlay />
      <DataSync />
      <BuyModal />
    </main>
  );
}
