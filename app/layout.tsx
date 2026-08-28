import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Same family as the OG card and the 3D billboard faces.
const outfit = localFont({
  src: [
    { path: "./fonts/Outfit-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Outfit-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "billboard.lol — the biggest billboard money can buy",
  description:
    "A low-poly American highway where companies bid for billboards. Pay more, get bigger, get seen first. A satire, obviously.",
};

export const viewport: Viewport = {
  themeColor: "#cfe8f8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>{children}</body>
    </html>
  );
}
