"use client";

import { fetchCloudConfig } from "./cloudConfig";

/**
 * Cloudflare Turnstile before server conversions. The server names the site
 * key in /api/config when it requires the check; then each conversion request
 * carries a fresh, single-use token in the CF-Turnstile-Response header.
 */

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  remove(id: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const ACTION = "convert";

let script: Promise<TurnstileApi> | null = null;
function loadScript(): Promise<TurnstileApi> {
  script ??= new Promise<TurnstileApi>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const el = document.createElement("script");
    el.src = SCRIPT;
    el.async = true;
    el.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("The security check didn't load.")));
    el.onerror = () => reject(new Error("The security check couldn't load. Check your connection or ad blocker, then try again."));
    document.head.appendChild(el);
  }).catch((err) => {
    script = null;
    throw err;
  });
  return script;
}

/** Show the widget in a small card, resolve with its token, then remove it. */
async function solve(siteKey: string): Promise<string> {
  const turnstile = await loadScript();
  const card = document.createElement("div");
  card.className = "fixed bottom-4 right-4 z-[1000] rounded-xl border border-line bg-raised p-3 shadow-lg";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-label", "Security check");
  const label = document.createElement("p");
  label.className = "mb-2 text-[12px] text-fg-muted";
  label.textContent = "Quick security check before converting…";
  const slot = document.createElement("div");
  card.append(label, slot);
  document.body.appendChild(card);

  let id: string | undefined;
  try {
    return await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("The security check timed out. Please try again.")), 3 * 60_000);
      const done = (fn: () => void) => {
        clearTimeout(timer);
        fn();
      };
      id = turnstile.render(slot, {
        sitekey: siteKey,
        action: ACTION,
        theme: "auto",
        callback: (token: string) => done(() => resolve(token)),
        "error-callback": () => done(() => reject(new Error("The security check failed. Please refresh the page and try again."))),
        "timeout-callback": () => done(() => reject(new Error("The security check timed out. Please try again."))),
      });
    });
  } finally {
    // Leave the "Success!" tick on screen for a moment so it doesn't flash.
    setTimeout(() => {
      if (id) turnstile.remove(id);
      card.remove();
    }, 600);
  }
}

// One widget at a time: batch conversions ask in turn.
let queue: Promise<unknown> = Promise.resolve();

/** Headers proving a person started this conversion ({} when the server doesn't ask). */
export async function turnstileHeaders(): Promise<Record<string, string>> {
  const { turnstileSiteKey } = await fetchCloudConfig();
  if (!turnstileSiteKey) return {};
  const next = queue.then(() => solve(turnstileSiteKey));
  queue = next.catch(() => undefined);
  return { "cf-turnstile-response": await next };
}
