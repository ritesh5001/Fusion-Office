/**
 * Cloudflare Turnstile in the browser: before a request that makes the server
 * do work (conversions, AI, voices, feedback, admin login), prove a person is
 * here. A solved check earns a 30-minute pass (an httpOnly cookie set by the
 * server), so people see the check once, not on every file or sentence.
 *
 * Off when the server reports no site key (/api/config), e.g. locally.
 */
import { fetchCloudConfig } from "./cloudConfig";

type Send = (path: string, init?: RequestInit) => Promise<Response>;

const PROTECTED = [/^\/api\/convert(\/|\?|$)/, /^\/api\/ai(\/|$)/, /^\/api\/feedback(\/|$)/, /^\/api\/admin\/login$/, /^\/api\/(contact|stories)(\/|$)/];
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const STORE = "fo-human-pass";
// Run the check again a minute early rather than racing the cookie's expiry.
const MARGIN = 60_000;

export const needsHuman = (path: string, init?: RequestInit) =>
  (init?.method ?? "GET").toUpperCase() !== "GET" && PROTECTED.some((r) => r.test(path.split("#")[0]));

let passUntil = (() => {
  try {
    return Number(sessionStorage.getItem(STORE)) || 0;
  } catch {
    return 0;
  }
})();
const hasPass = () => Date.now() < passUntil - MARGIN;

function notePass(res: Response) {
  const until = Number(res.headers.get("x-human-pass-expires"));
  if (!until) return;
  passUntil = until;
  try {
    sessionStorage.setItem(STORE, String(until));
  } catch {
    /* private mode: the pass just lasts for this page */
  }
}

async function rejectedForCheck(res: Response) {
  if (res.status !== 403) return false;
  const body = (await res
    .clone()
    .json()
    .catch(() => ({}))) as { code?: string };
  return body.code === "turnstile_required";
}

// One check at a time: requests that arrive meanwhile wait, then ride the new pass.
let queue: Promise<unknown> = Promise.resolve();

/** Send a protected request, solving a Turnstile check first when needed. */
export async function humanFetch(path: string, init: RequestInit | undefined, send: Send): Promise<Response> {
  const siteKey = (await fetchCloudConfig()).turnstileSiteKey;
  if (!siteKey) return send(path, init);

  if (hasPass()) {
    const res = await send(path, init);
    notePass(res);
    if (!(await rejectedForCheck(res))) return res;
    passUntil = 0; // The server forgot us (secret rotated, cookie cleared): check again.
  }

  const run = queue.then(async () => {
    if (hasPass()) return send(path, init);
    const token = await solveTurnstile(siteKey);
    const headers = new Headers(init?.headers);
    headers.set("cf-turnstile-response", token);
    const res = await send(path, { ...init, headers });
    notePass(res);
    return res;
  });
  queue = run.catch(() => {});
  return run;
}

/* ------------------------------------------------------------------ widget */

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("no turnstile")));
    s.onerror = () => {
      loading = null;
      s.remove();
      reject(new Error("Couldn't load the security check. Check your connection and try again."));
    };
    document.head.appendChild(s);
  });
  return loading;
}

const SHIELD =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>';

/**
 * Show a small "Quick security check" card with the Turnstile widget and
 * resolve with its token. Most people just see it tick itself; Cloudflare
 * asks for a click only when something looks off. Cancel rejects.
 */
function solveTurnstile(siteKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const opener = document.activeElement as HTMLElement | null;
    const root = document.createElement("div");
    root.className = "fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "fo-human-title");
    root.innerHTML = `
      <div data-backdrop class="fo-intro-fade absolute inset-0 bg-[#05060a]/60 backdrop-blur-sm [animation-duration:200ms]"></div>
      <div tabindex="-1" class="fo-palette-in relative w-full max-w-[400px] rounded-t-[24px] border border-line-strong bg-overlay p-6 shadow-pop outline-none sm:rounded-[24px]">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-raised text-accent ring-1 ring-inset ring-line-strong">${SHIELD}</span>
          <div>
            <h2 id="fo-human-title" class="font-display text-[18px] font-bold tracking-[-0.02em] text-fg">Quick security check</h2>
            <p class="text-[13px] leading-snug text-fg-muted">Confirming you're a person, not a bot.</p>
          </div>
        </div>
        <div data-widget class="mt-5 flex min-h-[65px] items-center justify-center"></div>
        <p data-status role="status" class="mt-2 min-h-[18px] text-center text-[12.5px] text-fg-subtle">Loading…</p>
        <button type="button" data-cancel class="fo-press mt-3 h-10 w-full rounded-xl text-[14px] font-medium text-fg-muted hover:bg-raised hover:text-fg">Cancel</button>
        <p class="mt-2 text-center text-[11.5px] leading-snug text-fg-subtle">Protected by Cloudflare Turnstile. Your files are not shared with Cloudflare.</p>
      </div>`;
    document.body.appendChild(root);
    const card = root.querySelector<HTMLElement>("[tabindex]")!;
    const status = root.querySelector<HTMLElement>("[data-status]")!;
    card.focus();

    let widget: string | null = null;
    let failures = 0;
    let done = false;
    const finish = (err: Error | null, token?: string) => {
      if (done) return;
      done = true;
      window.removeEventListener("keydown", onKey);
      const close = () => {
        if (widget) window.turnstile?.remove(widget);
        root.remove();
        opener?.focus?.();
      };
      if (err) {
        close();
        reject(err);
      } else {
        // Let the "Success!" tick show for a moment before closing.
        status.textContent = "Verified. Continuing…";
        window.setTimeout(close, 700);
        resolve(token!);
      }
    };
    const cancel = () => finish(new Error("The security check was cancelled. Please try again."));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cancel();
    window.addEventListener("keydown", onKey);
    root.querySelector("[data-cancel]")!.addEventListener("click", cancel);
    root.querySelector("[data-backdrop]")!.addEventListener("click", cancel);

    loadTurnstile()
      .then((ts) => {
        if (done) return;
        status.textContent = "";
        widget = ts.render(root.querySelector<HTMLElement>("[data-widget]")!, {
          sitekey: siteKey,
          action: "human",
          theme: "dark",
          appearance: "always",
          callback: (token: string) => finish(null, token),
          "expired-callback": () => widget && ts.reset(widget),
          "error-callback": (code?: string) => {
            // 1101xx/1102xx/1104xx: the widget isn't set up for this site (wrong key, domain not
            // allowed, bad action). Retrying can't fix that, so stop with a clear message.
            if (/^110[124]/.test(String(code ?? ""))) {
              console.error(`[turnstile] setup error ${code} on ${location.hostname}: add this domain to the Turnstile widget's hostnames in Cloudflare.`);
              finish(new Error("The security check isn’t set up for this address yet. Please try again in a little while."));
              return true;
            }
            if (++failures >= 3) {
              finish(new Error("The security check couldn't finish. Check your connection, turn off strict blockers for this site, and try again."));
              return true;
            }
            status.textContent = "The check hit a snag. Retrying…";
          },
        });
      })
      .catch((err: Error) => finish(err));
  });
}
