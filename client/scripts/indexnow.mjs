#!/usr/bin/env node
/**
 * Tell IndexNow search engines (Bing, Yandex, Seznam, Naver…) about every URL
 * in the live sitemap, so new and changed tool pages are crawled within days
 * instead of weeks. Google does not use IndexNow; submit the sitemap in
 * Search Console for Google.
 *
 * Run after a deploy:  npm run indexnow -w client
 * Only URLs passed as arguments:  npm run indexnow -w client -- /tools/jpg-to-svg
 *
 * The key is public by design: search engines fetch /<key>.txt to confirm
 * that the site owner sent the request.
 */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.fusionoffice.online").replace(/\/+$/, "");
const KEY = "fad1e8294c23bb16945fbc786c7915a3";
const UA = { "User-Agent": "Mozilla/5.0 (compatible; FusionOffice-IndexNow/1.0)" };

async function sitemapUrls() {
  const res = await fetch(`${SITE}/sitemap.xml`, { headers: UA });
  if (!res.ok) throw new Error(`sitemap.xml: HTTP ${res.status}`);
  return [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

const args = process.argv.slice(2);
const urls = args.length ? args.map((p) => (p.startsWith("http") ? p : `${SITE}${p.startsWith("/") ? p : `/${p}`}`)) : await sitemapUrls();

const keyCheck = await fetch(`${SITE}/${KEY}.txt`, { headers: UA });
if (!keyCheck.ok || (await keyCheck.text()).trim() !== KEY) {
  console.error(`Key file ${SITE}/${KEY}.txt is not live yet. Deploy first, then run this again.`);
  process.exit(1);
}

// The protocol accepts up to 10,000 URLs per request.
for (let i = 0; i < urls.length; i += 10_000) {
  const urlList = urls.slice(i, i + 10_000);
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", ...UA },
    body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
  });
  // 200 = accepted, 202 = accepted, key validation pending.
  console.log(`IndexNow: ${urlList.length} URLs → HTTP ${res.status}${res.ok ? "" : ` ${await res.text()}`}`);
  if (!res.ok) process.exitCode = 1;
}
