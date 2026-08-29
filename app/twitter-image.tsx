export { default, alt, size, contentType } from "./opengraph-image";

export const runtime = "nodejs";
// Never prerendered at build time (there's no browser to launch during a
// build) — always rendered on request, with the expensive part cached below.
export const dynamic = "force-dynamic";
