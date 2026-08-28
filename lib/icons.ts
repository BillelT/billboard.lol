// Favicons are served back through our own origin: the site's own icon URL would
// taint the WebGL canvas (no CORS headers) and often blocks hotlinking.
export function iconSrc(domain: string): string {
  return `/api/icon?domain=${encodeURIComponent(domain)}`;
}

type Entry = { img: HTMLImageElement | null };
const icons = new Map<string, Entry>();

/**
 * The favicon for a domain if it is already decoded, otherwise null — and the
 * load is kicked off so a later call gets the image. Never throws: a domain
 * without a usable icon simply stays null and the face keeps its monogram.
 */
export function getIcon(domain: string): HTMLImageElement | null {
  const hit = icons.get(domain);
  if (hit) return hit.img;
  if (typeof window === "undefined") return null;

  const entry: Entry = { img: null };
  icons.set(domain, entry);
  const img = new Image();
  img.decoding = "async";
  img.crossOrigin = "anonymous";
  img.onload = () => {
    entry.img = img;
  };
  img.src = iconSrc(domain);
  return null;
}
