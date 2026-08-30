import "server-only";
import { existsSync } from "node:fs";

// A pre-installed Chromium some dev/CI environments provide out of band,
// keyed by the PLAYWRIGHT_BROWSERS_PATH env convention. Used only as a local
// fallback when no system Chromium is on PATH.
const FALLBACK_CHROMIUM = `${process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers"}/chromium`;

// Renders a page headlessly and returns a PNG screenshot of its 1200x630
// viewport.
//
// puppeteer-core throughout, not playwright-core: @sparticuz/chromium is
// built and tested specifically as a puppeteer-core launch target for
// serverless runtimes (Vercel, Lambda) — its Chromium build doesn't speak
// the exact protocol playwright-core expects, so pairing it with
// playwright-core launches locally (where Playwright finds its own matching
// browser first) but throws on Vercel, where @sparticuz/chromium's binary is
// the only one available.
export async function renderPngScreenshot(url: string): Promise<Buffer> {
  const puppeteer = await import("puppeteer-core");
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  const launchOptions = isServerless
    ? await (async () => {
        const sparticuz = (await import("@sparticuz/chromium")).default;
        return {
          executablePath: await sparticuz.executablePath(),
          args: sparticuz.args,
          headless: true,
        };
      })()
    : {
        headless: true,
        executablePath: existsSync(FALLBACK_CHROMIUM) ? FALLBACK_CHROMIUM : undefined,
        // this sandbox (and some CI containers) run Chromium as root, which
        // refuses to start without this — harmless anywhere else
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      };

  const browser = await puppeteer.launch(launchOptions);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630 });
    // Don't wait on network idle: the page's own favicon fetch can hang (a
    // slow or unreachable third-party site), and there's no reason to wait
    // for it anyway — the explicit [data-og-ready] marker below is the real
    // signal, set only once React has actually settled.
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-og-ready]", { timeout: 8000 });
    const png = await page.screenshot({ type: "png" });
    return Buffer.from(png);
  } finally {
    await browser.close();
  }
}
