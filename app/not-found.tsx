import type { Metadata } from "next";
import Night404Experience from "@/components/Night404Experience";

export const metadata: Metadata = {
  title: "404 — bidboard.lol",
  description: "Nothing to see here. Click the billboard to head back.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <Night404Experience />;
}
