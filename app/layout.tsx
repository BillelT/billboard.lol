import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Same family as the OG card and the 3D billboard faces.
const outfit = localFont({
  src: [
    { path: "./fonts/Outfit-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Outfit-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Outfit-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-outfit",
  display: "swap",
});

const title = "bidboard.lol — the biggest billboard money can buy";
const description =
  "bidboard.lol is a live pay-to-outbid leaderboard: bid real money to plant a billboard on a low-poly American highway. Outbid the leader, get bigger, get seen first.";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: title, template: "%s — bidboard.lol" },
  description,
  applicationName: "bidboard.lol",
  authors: [{ name: "Billel Tighidet", url: "https://x.com/billel_tighidet" }],
  creator: "Billel Tighidet",
  publisher: "bidboard.lol",
  category: "advertising",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "bidboard.lol",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    creator: "@billel_tighidet",
  },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: "#cfe8f8",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${site}/#website`,
      url: site,
      name: "bidboard.lol",
      description,
      publisher: { "@id": `${site}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${site}/#organization`,
      name: "bidboard.lol",
      url: site,
      logo: `${site}/icon.png`,
      founder: { "@type": "Person", name: "Billel Tighidet", sameAs: "https://x.com/billel_tighidet" },
      sameAs: ["https://x.com/billel_tighidet"],
    },
    {
      "@type": "Service",
      "@id": `${site}/#service`,
      name: "bidboard.lol billboard placement",
      description:
        "Pay-to-outbid ranking where companies bid for the biggest billboard on a low-poly American highway. Outbid the current leader to take the #1 spot.",
      provider: { "@id": `${site}/#organization` },
      areaServed: "Worldwide",
      offers: { "@type": "Offer", priceCurrency: "USD", availability: "https://schema.org/InStock" },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
