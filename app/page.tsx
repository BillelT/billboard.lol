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
  const description = `${leader.name} paid ${fmtUSD(leader.amount)} for the biggest billboard on the highway. Take the top spot for ${fmtUSD(leader.amount + 1)}.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: "website", url, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function Page() {
  return (
    <main>
      {/* The road is a WebGL scene, so this is the only text crawlers and
          screen readers get about what the page actually is. */}
      <p className="sr-only">
        bidboard.lol is a live, paid ranking where companies bid to plant a billboard on a 3D
        American highway. Pay more than the current leader and take the biggest, most visible
        spot on the road — see who&apos;s #1 right now and how much it cost them.
      </p>
      <Experience />
      <GrabNav />
      <Overlay />
      <DataSync />
      <BuyModal />
    </main>
  );
}
