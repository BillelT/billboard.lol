import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OutGrow.lol — the biggest billboard money can buy",
  description:
    "A low-poly American highway where companies bid for billboards. Pay more, get bigger, get seen first. A satire, obviously.",
};

export const viewport: Viewport = {
  themeColor: "#cfe8f8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
