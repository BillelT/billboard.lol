import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // the OG route reads the font from disk at request time
  outputFileTracingIncludes: {
    "/opengraph-image": ["./app/fonts/*.ttf"],
    "/twitter-image": ["./app/fonts/*.ttf"],
  },
};

export default nextConfig;
