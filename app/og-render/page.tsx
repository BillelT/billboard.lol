import type { Metadata } from "next";
import { notFound } from "next/navigation";
import OgRenderClient from "./OgRenderClient";

// Internal-only page: the OG image route headlessly screenshots this to get
// a real 3D render of the current #1 billboard. Never linked from the site,
// so it's always rendered fresh from its query string, never prebuilt.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

// robots.txt only asks well-behaved crawlers to skip this page — it doesn't
// stop a person from just visiting the URL, and this page is also the debug
// scene builder (?debug=1), so it must not be publicly browsable in
// production. opengraph-image.tsx (the only legitimate caller in prod) signs
// its request with this same secret via the `key` param.
function isAuthorized(params: Record<string, string | undefined>): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const secret = process.env.OG_RENDER_SECRET;
  return Boolean(secret) && params.key === secret;
}

export default async function OgRenderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(sp)) {
    params[key] = Array.isArray(value) ? value[0] : value;
  }
  if (!isAuthorized(params)) notFound();
  return <OgRenderClient params={params} />;
}
