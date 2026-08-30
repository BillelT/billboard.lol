import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium resolves its own binaries relative to its package
  // directory (node_modules/@sparticuz/chromium/bin) at runtime. Left to
  // Next's default bundling it gets relocated into the compiled output,
  // and that directory no longer exists where the package expects it —
  // exactly the "input directory ... does not exist" crash seen in prod
  // (see https://github.com/Sparticuz/chromium#bundler-configuration).
  // serverExternalPackages keeps it as a plain node_modules require
  // instead, so its bin/ directory stays put.
  serverExternalPackages: ["@sparticuz/chromium"],
  // Belt and suspenders: the bin/ files are only ever reached via a path
  // @sparticuz/chromium computes itself, not a static import, so make sure
  // Next's file tracer still copies them into the deployed function.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./node_modules/@sparticuz/chromium/**"],
    "/twitter-image": ["./node_modules/@sparticuz/chromium/**"],
  },
};

export default nextConfig;
