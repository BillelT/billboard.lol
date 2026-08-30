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
export async function generateMetadata(): Promise<Metadata> {
  const ranking = await getRanking();
  const leader = [...ranking].sort((a, b) => b.amount - a.amount)[0];
  if (!leader) return {};
  const title = `Currently #1: ${leader.name} — bidboard.lol`;
  const description = `${leader.name} paid ${fmtUSD(leader.amount)} for the biggest billboard on the highway. Take the top spot for ${fmtUSD(leader.amount + 1)}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
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
