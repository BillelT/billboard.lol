import Link from "next/link";

// Real pages, not the WebGL scroll — the road stays behind the paper-and-ink
// language the rest of the site already speaks (see globals.css `.legal*`).
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="legal">
      <header className="legal__header">
        <Link href="/" className="wordmark">
          <span className="wordmark__sign" aria-hidden="true" />
          bidboard<em>.lol</em>
        </Link>
      </header>
      <main className="legal__main">{children}</main>
    </div>
  );
}
