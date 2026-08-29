import "server-only";
import { existsSync } from "node:fs";

// A pre-installed Chromium some dev/CI environments provide out of band
// (outside playwright-core's own version-pinned download), keyed by the
// PLAYWRIGHT_BROWSERS_PATH env convention. Used only if playwright-core's own
// expected revision isn't present, so it's a fallback, not the first choice.
const FALLBACK_CHROMIUM = `${process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers"}/chromium`;

// Renders a page headlessly and returns a PNG screenshot of its 1200x630
// viewport. Locally, Playwright's own Chromium build already sits on disk
// (dev machines run `playwright install` once); on Vercel's serverless
// runtime there's no browser to find, so @sparticuz/chromium supplies one
// built for that environment instead.
export async function renderPngScreenshot(url: string): Promise<Buffer> {
  const { chromium } = await import("playwright-core");
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
    : existsSync(FALLBACK_CHROMIUM)
      ? { headless: true, executablePath: FALLBACK_CHROMIUM }
      : { headless: true };

  const browser = await chromium.launch(launchOptions);
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-og-ready]", { state: "attached", timeout: 8000 });
    const png = await page.screenshot({ type: "png" });
    return Buffer.from(png);
  } finally {
    await browser.close();
  }
}
