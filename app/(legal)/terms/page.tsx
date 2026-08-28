import type { Metadata } from "next";
import Link from "next/link";

const title = "Terms of Service — bidboard.lol";
const description = "The terms that govern paying for a billboard on bidboard.lol.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/terms" },
  openGraph: { title, description, url: "/terms", type: "website" },
  twitter: { card: "summary", title, description },
};

export default function TermsPage() {
  return (
    <article className="legal__doc">
      <h1>Terms of Service</h1>
      <p className="legal__updated">Effective August 28, 2026. Last updated August 28, 2026.</p>

      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern access to and use of bidboard.lol (the
        &ldquo;Service&rdquo;), including the public highway, checkout, and related features. By
        using the Service or completing a payment, you agree to these Terms and to our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <p>If you do not agree, do not use the Service and do not pay for a billboard.</p>

      <h2>Operator and contact</h2>
      <p>
        The Service is operated by Billel Tighidet (&ldquo;we,&rdquo; &ldquo;us,&rdquo;
        &ldquo;our&rdquo;). Legal notices and other contact can be sent via{" "}
        <a href="https://x.com/billel_tighidet" target="_blank" rel="noopener noreferrer">
          @billel_tighidet
        </a>{" "}
        on X.
      </p>

      <h2>What the Service is</h2>
      <p>
        bidboard.lol is a paid public ranking. You may pay to plant a billboard for a domain and
        occupy the rank that amount can take. Billboards are{" "}
        <strong>paid placements, not editorial reviews, certifications, or endorsements</strong> —
        by us or by any company already on the road.
      </p>
      <p>
        A payment buys a chance to appear on the road at the rank that amount can take at the time
        it is confirmed. It does not buy traffic, clicks, customers, revenue, a fixed duration, a
        guaranteed position, search-engine ranking, or any particular result. Someone else can pay
        more and outrank you at any time. We may change, pause, or discontinue features, including
        categories, cycles, or the ranking formula itself.
      </p>

      <h2>Eligibility</h2>
      <ul>
        <li>You must be at least 18 years old and able to form a binding contract.</li>
        <li>
          If you use the Service on behalf of a company, you represent that you have authority to
          bind that company, and &ldquo;you&rdquo; includes that company.
        </li>
        <li>
          You may not use the Service if you are prohibited from receiving services under
          applicable law, including trade sanctions.
        </li>
      </ul>

      <h2>Payments, Stripe, and taxes</h2>
      <p>
        Checkout is processed by Stripe. We do not collect or store full payment-card numbers.
        Stripe&apos;s own terms and privacy notice apply to the payment itself. Amounts are priced
        in US dollars. Completing checkout is an offer to buy billboard placement on these terms;
        your rank is assigned once payment is confirmed, at whatever position that amount then
        supports.
      </p>

      <h2>No refunds</h2>
      <p>
        <strong>All payments are final and non-refundable.</strong> Placement is a digital service
        that begins as soon as payment is confirmed: the billboard is created and the paid amount
        is counted toward the public ranking immediately. Being outranked later, a cycle reset, a
        site you dislike, downtime, or a later removal for breach of these Terms does not create a
        refund.
      </p>
      <p>
        By completing checkout you request that we start this digital service immediately, and
        acknowledge that you lose any statutory right of withdrawal or cooling-off period to the
        extent the law allows that waiver. Where a mandatory consumer right cannot be waived, we
        honor that right. Chargebacks, payment disputes, or reversed payments made without a
        legally required basis are a breach of these Terms; we may remove the billboard and refuse
        future use of the Service.
      </p>

      <h2>Listings must be yours to place</h2>
      <p>
        You may only plant a billboard for a domain you own, work for, or are otherwise authorized
        to advertise. Details that are missing, fake, or that we cannot reasonably verify, or a
        domain that impersonates someone else, are grounds for removal.{" "}
        <strong>
          We may take down a billboard at any time if these conditions are not met, without a
          refund.
        </strong>
      </p>

      <h2>Your warranties</h2>
      <p>By submitting a domain and completing a payment, you represent and warrant that:</p>
      <ul>
        <li>you have the right to advertise that domain and send visitors to it;</li>
        <li>
          the domain and its contents comply with applicable law, including advertising,
          consumer-protection, intellectual-property, and regulated-industry rules;
        </li>
        <li>you are not impersonating another person, brand, or company;</li>
        <li>
          the domain is not malware, phishing, a scam, or a site whose primary purpose is to
          deceive visitors.
        </li>
      </ul>

      <h2>Prohibited listings and use</h2>
      <p>You may not list or use the Service for:</p>
      <ul>
        <li>sexual, pornographic, or adult-platform content;</li>
        <li>
          content that is illegal, fraudulent, defamatory, harassing, hateful, violent, or
          exploits children;
        </li>
        <li>
          counterfeit goods, unauthorized streaming, or other infringement of copyright, trademark,
          or other rights;
        </li>
        <li>
          offers that require licenses you don&apos;t have, including certain financial, medical,
          gambling, or weapons-related offers;
        </li>
        <li>
          interfering with the Service: scraping beyond ordinary browsing, manipulating the
          ranking or presence counters, bypassing rate limits, or automated checkout without our
          written permission.
        </li>
      </ul>

      <h2>Our right to remove listings</h2>
      <p>
        We may refuse, delay, or permanently remove any billboard, with or without notice,
        including where we believe these Terms or the law have been broken, where a rights holder
        or a company complains, or where we think a listing creates legal, security, or
        reputational risk. Removal does not entitle you to a refund.
      </p>

      <h2>Fair use and third-party content</h2>
      <p>
        To show a billboard we fetch and display publicly available information about the domain
        you submit: its favicon, page title, meta description, and theme color. We use that
        material only to display your billboard and to operate, moderate, and improve the Service
        — never to suggest sponsorship or endorsement by the domain&apos;s owner unless that owner
        is the one who paid. bidboard.lol, our wordmark, and the look of the Service are ours; you
        may not scrape the road for a competing ranking product, or use our brand in a way that
        suggests we endorse you.
      </p>

      <h2>License you grant us</h2>
      <p>
        You grant us a worldwide, non-exclusive, royalty-free license to host, cache, reproduce,
        and adapt (for sizing, formatting, and ranking display) the billboard and the public
        metadata we fetch, for as long as needed to operate the Service and keep a hall-of-fame
        archive of past cycles. Visitors are granted a right to see that billboard on the Service.
        If you want a billboard taken down, contact us — a takedown does not undo a completed
        payment.
      </p>

      <h2>Complaints and rights notices</h2>
      <p>
        If you believe a billboard infringes your copyright, trademark, or other rights, or that a
        listed domain is unlawful, contact us with: (1) your name and contact details; (2) the
        domain on the billboard; (3) a description of the problem; and (4) a statement that the
        notice is accurate and that you are the rights holder or authorized to act. We may remove
        or restrict the billboard while we review the notice, and may share it with the billboard&apos;s
        owner. Repeat or abusive notices may be ignored.
      </p>

      <h2>No endorsement, no earnings claims</h2>
      <p>
        Appearance on the road is not our opinion of a product. We do not verify that listed
        companies, their claims, or their sites are accurate or lawful. The live counters
        (&ldquo;N on the road,&rdquo; total raised, tallest billboard) describe what our systems
        recorded; they are not a promise you will get any particular outcome. Your results depend
        on your rank, your domain, timing, and factors we don&apos;t control. Links from the
        Service to a listed domain leave bidboard.lol — that destination has its own terms and
        practices, and we are not responsible for it.
      </p>

      <h2>Availability and changes</h2>
      <p>
        We provide the Service as-is. It may be unavailable, slow, or incorrect. We may change
        ranking rules, minimums, categories, cycles, or these Terms. If a change is material, we
        will update the date at the top of this page. Continued use after a change means you
        accept the new Terms. For a payment already completed, the Terms in effect at checkout
        still apply to that payment, except where a change is required by law or needed to address
        a security or legal risk.
      </p>

      <h2>Disclaimers</h2>
      <p>
        To the fullest extent permitted by law, we disclaim all warranties, express or implied,
        including merchantability, fitness for a particular purpose, and non-infringement. We do
        not warrant that the Service will be uninterrupted, secure, or free of errors, or that
        billboards, ranks, or counters are accurate or complete.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        We do not limit liability that applicable law says we cannot, including liability for
        intent, gross negligence, injury to life, body, or health, or liability under mandatory
        product-liability rules. Subject to that:
      </p>
      <ul>
        <li>
          we are not liable for lost profits, lost data, lost goodwill, substitute services, or
          other indirect, incidental, special, or consequential damages;
        </li>
        <li>
          for slight negligence, we are liable only for a foreseeable breach of duties that are
          essential to these Terms, and only for typical, foreseeable damage;
        </li>
        <li>
          our total liability for a claim relating to a payment is limited to the amount you paid
          us for the billboard that claim concerns in the three months before the claim.
        </li>
      </ul>

      <h2>Indemnity</h2>
      <p>
        You will defend, indemnify, and hold harmless Billel Tighidet and anyone working on the
        Service from claims, damages, losses, and reasonable legal fees arising out of your
        billboard, your destination domain, your payment or a chargeback, your breach of these
        Terms, or your infringement of someone else&apos;s rights. We may take over the defense of
        a claim; you will cooperate.
      </p>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by French law, excluding conflict-of-laws rules. If you are a
        consumer with a mandatory local law that cannot be displaced, that law still protects you.
      </p>

      <h2>General</h2>
      <ul>
        <li>
          If a part of these Terms is unenforceable, the rest remains in effect, and the invalid
          part is replaced by the valid term that comes closest to the original intent.
        </li>
        <li>
          Our failure to enforce a provision is not a waiver. You may not assign these Terms
          without our consent; we may assign them in connection with a transfer of the Service.
        </li>
        <li>These Terms, the Privacy Policy, and the checkout details you confirm form the entire agreement for the Service.</li>
        <li>
          Payments, hosting, and domain-information lookup involve third parties, including
          Stripe, Supabase, and our hosting provider. Their outages or decisions are outside our
          control.
        </li>
      </ul>

      <h2>Contact</h2>
      <p>
        Questions about these Terms, or a takedown request, can be sent to{" "}
        <a href="https://x.com/billel_tighidet" target="_blank" rel="noopener noreferrer">
          @billel_tighidet
        </a>
        .
      </p>

      <p className="legal__see-also">
        See also our <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </article>
  );
}
