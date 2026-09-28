import { existsSync } from "node:fs";
import puppeteer, { TimeoutError, type Browser } from "puppeteer-core";
import { HttpError } from "./http.js";
import { BLOCKED_HEADER, checkPublicUrl, startEgressProxy } from "./netGuard.js";
import { semaphore } from "./rateLimit.js";

/** CHROME_PATH, or a Chrome/Chromium found in the usual places. */
export const CHROME =
  process.env.CHROME_PATH ||
  ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find((p) =>
    existsSync(p),
  ) ||
  "";
const PAGE_TIMEOUT_MS = 30_000;
const MAX_REQUESTS = 600;

let launching: Promise<Browser> | null = null;

/** One shared headless browser, started on first use and restarted if it dies. */
function browser(): Promise<Browser> {
  if (!CHROME) throw new HttpError(503, "Web page conversion isn't available on this server yet.");
  launching ??= (async () => {
    const proxy = await startEgressProxy();
    const b = await puppeteer.launch({
      executablePath: CHROME,
      headless: true,
      args: [
        `--proxy-server=http://127.0.0.1:${proxy.port}`,
        // Chrome skips proxies for localhost unless told otherwise.
        "--proxy-bypass-list=<-loopback>",
        // WebRTC can send UDP around the proxy.
        "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-extensions",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-dev-shm-usage",
        "--hide-scrollbars",
        "--mute-audio",
        ...(process.env.CHROME_NO_SANDBOX === "1" ? ["--no-sandbox"] : []),
      ],
    });
    b.on("disconnected", () => {
      proxy.close();
      launching = null;
    });
    return b;
  })().catch((err) => {
    launching = null;
    console.error("[html] could not start Chrome:", err);
    throw new HttpError(503, "Web page conversion isn't available on this server yet.");
  });
  return launching;
}

const queue = semaphore(Number(process.env.HTML_CONCURRENCY) || 2);

export interface HtmlOptions {
  url: string;
  pageSize: "A4" | "Letter";
  landscape: boolean;
}

/** Render a public web page to PDF in a fresh, isolated browser context. */
export async function htmlToPdf(opts: HtmlOptions): Promise<Uint8Array> {
  const url = await checkPublicUrl(opts.url);
  return queue(async () => {
    const b = await browser();
    const context = await b.createBrowserContext();
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(PAGE_TIMEOUT_MS);
      await page.setBypassServiceWorker(true);
      await page.evaluateOnNewDocument(() => {
        // No peer-to-peer connections, which could route around the proxy.
        for (const k of ["RTCPeerConnection", "webkitRTCPeerConnection", "RTCDataChannel"]) delete (globalThis as Record<string, unknown>)[k];
      });
      let requests = 0;
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        if (req.isInterceptResolutionHandled()) return;
        const scheme = req.url().slice(0, req.url().indexOf(":"));
        if (!["http", "https", "data", "blob"].includes(scheme) || ++requests > MAX_REQUESTS) return void req.abort("blockedbyclient");
        void req.continue();
      });
      page.on("dialog", (d) => void d.dismiss());

      let response;
      try {
        response = await page.goto(url.href, { waitUntil: "networkidle2", timeout: PAGE_TIMEOUT_MS });
      } catch (err) {
        if (err instanceof TimeoutError) {
          // Busy pages never go idle; print whatever has loaded by now.
          if (page.url() === "about:blank") throw new HttpError(504, "The page took too long to load.");
        } else {
          const reason = (err as Error).message.match(/net::[A-Z_]+/)?.[0];
          if (reason === "net::ERR_TUNNEL_CONNECTION_FAILED") throw new HttpError(400, "That page redirects to an address that isn't on the public internet.");
          throw new HttpError(422, `Couldn't open that page${reason ? ` (${reason})` : ""}.`);
        }
      }
      if (response?.headers()[BLOCKED_HEADER]) throw new HttpError(400, "That page redirects to an address that isn't on the public internet.");
      if (response && response.status() >= 400) throw new HttpError(422, `The page answered with an error (${response.status()}).`);

      const pdf = await page.pdf({
        format: opts.pageSize,
        landscape: opts.landscape,
        printBackground: true,
        margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
        timeout: PAGE_TIMEOUT_MS,
      });
      return new Uint8Array(pdf);
    } finally {
      await context.close().catch(() => {});
    }
  });
}

/** Close the shared browser (tests, shutdown). */
export async function closeBrowser() {
  const b = await launching?.catch(() => null);
  await b?.close();
}
