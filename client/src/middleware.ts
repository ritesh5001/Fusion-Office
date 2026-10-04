import { NextResponse, type NextRequest } from "next/server";
import { COMING_SOON_PATH, PREVIEW_COOKIE, isLaunched } from "@/lib/launch";

/**
 * Before launch, every page request shows the coming-soon countdown (the URL
 * stays the same, so the page opens by itself once the timer ends). Static
 * files, the API proxy and Google's verification file are left alone.
 *
 * Developer preview: /any-page?preview=<PREVIEW_TOKEN> sets a 30-day cookie
 * that opens the real site; ?preview=off removes it. PREVIEW_TOKEN lives only
 * in the environment (the repo is public), never in code.
 */
export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if (isLaunched()) {
    // After launch the countdown page has nothing to show.
    return pathname === COMING_SOON_PATH ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  }

  const token = process.env.PREVIEW_TOKEN ?? "";
  const asked = searchParams.get("preview");

  if (asked !== null) {
    const clean = req.nextUrl.clone();
    clean.searchParams.delete("preview");
    const res = NextResponse.redirect(clean);
    if (asked === "off") res.cookies.delete(PREVIEW_COOKIE);
    else if (token && safeEqual(asked, token)) {
      res.cookies.set(PREVIEW_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:", path: "/", maxAge: 60 * 60 * 24 * 30 });
    }
    return res;
  }

  const cookie = req.cookies.get(PREVIEW_COOKIE)?.value ?? "";
  if (token && safeEqual(cookie, token)) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex");
    return res;
  }

  if (pathname === COMING_SOON_PATH) return withGateHeaders(NextResponse.next());
  return withGateHeaders(NextResponse.rewrite(new URL(COMING_SOON_PATH, req.url)));
}

/** Never cache the countdown in place of a real page, and keep it out of search results. */
function withGateHeaders(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, must-revalidate");
  res.headers.set("X-Robots-Tag", "noindex");
  return res;
}

/** Constant-time comparison, so the token can't be guessed from response timing. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const config = {
  // Node runtime so PREVIEW_TOKEN and LAUNCH_AT are read from the server's environment at runtime.
  runtime: "nodejs",
  // Pages only: skip Next's assets, the /api proxy and any file with an extension (icons, workers, googlef….html).
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
