import type { Metadata } from "next";
import Link from "next/link";

const title = "Privacy Policy — bidboard.lol";
const description = "How bidboard.lol collects, uses, and shares information.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/privacy" },
  openGraph: { title, description, url: "/privacy", type: "website" },
  twitter: { card: "summary", title, description },
};

export default function PrivacyPage() {
  return (
    <article className="legal__doc">
      <h1>Privacy Policy</h1>
      <p className="legal__updated">Effective August 28, 2026. Last updated August 28, 2026.</p>

      <p>
        This Privacy Policy explains how bidboard.lol (https://bidboard.lol) collects, uses, and
        shares information when you visit the site, plant a billboard, or pay for a ranking. It
        sits alongside our <Link href="/terms">Terms of Service</Link>.
      </p>

      <h2>Who is responsible</h2>
      <p>
        The controller for personal data processed through the Service is Billel Tighidet.
        Contact:{" "}
        <a href="https://x.com/billel_tighidet" target="_blank" rel="noopener noreferrer">
          @billel_tighidet
        </a>{" "}
        on X.
      </p>

      <h2>What we collect</h2>
      <p>We keep the Service small. We collect only what we need to run the road, take payment, and stop abuse:</p>
      <ul>
        <li>
          <strong>Presence identifier.</strong> A random ID generated in your browser for the
          length of your visit, used only to power the live &ldquo;N on the road&rdquo; counter.
          It is not a cookie, is not stored on our servers, and disappears when you close the tab.
        </li>
        <li>
          <strong>Checkout and listing data.</strong> The domain, category, and amount you submit;
          the page title, meta description, favicon, and theme color we read off that
          domain&apos;s public homepage at the time of payment; and the Stripe checkout session ID
          tied to the payment.
        </li>
        <li>
          <strong>Payment data.</strong> Card details and billing identity are collected by
          Stripe, not by us. Stripe sends us confirmation of what you paid and the amount. See
          Stripe&apos;s own privacy notice.
        </li>
      </ul>

      <h2>Technical data</h2>
      <p>
        Standard request data, such as IP address and user agent, may be processed by our hosting
        provider to serve pages, keep the Service running, and prevent abuse. We do not run a
        separate analytics tool, and we do not set advertising or tracking cookies.
      </p>

      <h2>Messages you send us</h2>
      <p>
        If you send us a notice, a category correction, or a privacy request, we keep that
        correspondence as needed to respond to it and to keep a record where the law requires one.
      </p>

      <h2>Cookies</h2>
      <p>
        bidboard.lol does not set first-party tracking or analytics cookies. Stripe sets its own
        cookies during checkout under its own privacy policy, which we don&apos;t control.
      </p>

      <h2>Why we use this data</h2>
      <ul>
        <li><strong>Contract.</strong> To take payment, create or grow your billboard, show your rank, and provide the Service you asked for.</li>
        <li><strong>Legitimate interests.</strong> To keep the ranking fair (avoid double-crediting a payment), measure usage, and debug outages.</li>
        <li><strong>Legal obligation.</strong> To keep tax, accounting, and complaint records where the law requires it.</li>
      </ul>

      <h2>Public billboards</h2>
      <p>
        Rank, amount paid, domain, and the scraped title, description, and icon shown on a
        billboard are public — anyone can see them, including search engines. We fetch this public
        metadata because you submitted the domain to us; that fetch discloses to the destination
        domain that bidboard.lol requested its page, the same way any visitor would.
      </p>

      <h2>Who we share data with</h2>
      <ul>
        <li><strong>Stripe</strong> — checkout and payment confirmation.</li>
        <li><strong>Supabase</strong> — stores the billboard, payment, and cycle records described above.</li>
        <li>Our hosting provider — standard request logs for serving pages and securing the Service.</li>
        <li>
          Google&apos;s public favicon service — used as a fallback when a domain doesn&apos;t
          serve a readable icon of its own; only the domain you submitted is sent to it.
        </li>
      </ul>
      <p>We do not sell your personal data, and we don&apos;t share it beyond what running the Service requires.</p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Presence identifiers are never stored on our servers — they exist only for the length of your visit.</li>
        <li>Public billboard entries stay live while their cycle is current, and remain afterward in the hall of fame.</li>
        <li>Payment identifiers and amounts are kept as long as needed for accounting, tax, fraud, and dispute handling.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        If GDPR or a similar law applies to you, you can ask us to access, correct, delete, or
        export the personal data we hold about you, and to restrict or object to processing.
        Contact us via{" "}
        <a href="https://x.com/billel_tighidet" target="_blank" rel="noopener noreferrer">
          @billel_tighidet
        </a>{" "}
        — we need enough information to find your data. A billboard&apos;s public content that is
        also on your own website isn&apos;t made private just because it appears on bidboard.lol,
        but you can ask us to remove the billboard.
      </p>

      <h2>Children</h2>
      <p>
        The Service is for adults. We don&apos;t knowingly collect personal data from children —
        if you believe a child has used the Service, contact us and we will delete the data we can
        identify.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy when the Service or the law changes. The date at the top of this
        page is the current version; if a change is material, we will post the updated policy
        here.
      </p>

      <p className="legal__see-also">
        See also our <Link href="/terms">Terms of Service</Link>.
      </p>
    </article>
  );
}
