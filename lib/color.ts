// Shared color math for anything that paints a billboard card — the 3D face
// texture, the peek preview, the OG image, and the server-side favicon reader.
// No DOM/Node dependency, so it runs in all of them.

export function relLuminance(hex: string): number {
  const ch = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(0) + 0.7152 * ch(1) + 0.0722 * ch(2);
}

const DARK_INK = "#1f2733";

/** Card text is always white or this dark ink — whichever reads on the card's background. */
export function textColorFor(hex: string): string {
  return relLuminance(hex) > 0.4 ? DARK_INK : "#ffffff";
}
