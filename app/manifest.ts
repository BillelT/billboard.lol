import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "bidboard.lol — the biggest billboard money can buy",
    short_name: "bidboard.lol",
    description:
      "A low-poly American highway where companies bid for billboards. Pay more, get bigger, get seen first.",
    start_url: "/",
    display: "standalone",
    background_color: "#cfe8f8",
    theme_color: "#cfe8f8",
    icons: [
      {
        src: "/icon.png",
        sizes: "256x256",
        type: "image/png",
      },
    ],
  };
}
