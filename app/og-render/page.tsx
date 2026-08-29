import type { Metadata } from "next";
import OgRenderClient from "./OgRenderClient";

// Internal-only page: the OG image route headlessly screenshots this to get
// a real 3D render of the current #1 billboard. Never linked from the site,
// so it's always rendered fresh from its query string, never prebuilt.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

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
  return <OgRenderClient params={params} />;
}
