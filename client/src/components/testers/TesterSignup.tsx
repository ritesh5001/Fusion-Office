"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, Heart, Loader2, LockKeyhole, Smartphone } from "lucide-react";
import { Logo } from "../Logo";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

/**
 * Invite-only sign-up for early testers. Their name, username and photo are
 * shown on the Special thanks screen of the mobile app; the email stays
 * private. The page works only with the invite code from the link we send.
 */

type Invite = "checking" | "valid" | "invalid" | "closed";
type Status = { kind: "idle" } | { kind: "sending" } | { kind: "error"; message: string } | { kind: "done" };

/** Largest photo we try to open in the browser. */
const MAX_FILE = 25 * 1024 * 1024;
/** Photos are shrunk to this many pixels on the long side before upload; the server makes the final small square. */
const UPLOAD_SIDE = 1200;

const input =
  "h-11 w-full rounded-xl border border-line-strong bg-sunken px-3.5 text-[15px] text-fg outline-none transition placeholder:text-fg-subtle focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/20";

/** Open any photo the browser can decode, turn it upright, and shrink it to a JPEG data URL. */
async function shrinkPhoto(file: File): Promise<string> {
  if (file.size > MAX_FILE) throw new Error("That photo is too large. Please choose one under 25 MB.");
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Older Safari: fall back to an <img>, which also applies EXIF orientation.
    const url = URL.createObjectURL(file);
    try {
      source = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("decode"));
        img.src = url;
      });
    } catch {
      throw new Error("We couldn't open that photo. Please choose a JPG or PNG image.");
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
  const w = source.width;
  const h = source.height;
  if (Math.min(w, h) < 64) throw new Error("That photo is too small. Please choose a clearer one.");
  const scale = Math.min(1, UPLOAD_SIDE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();
  return canvas.toDataURL("image/jpeg", 0.88);
}

function useInvite(code: string): Invite {
  const [state, setState] = useState<Invite>("checking");
  useEffect(() => {
    if (!code) return void setState("invalid");
    let alive = true;
    apiFetch(`/api/testers/invite/${encodeURIComponent(code)}`)
      .then((r) => r.json() as Promise<{ valid?: boolean; open?: boolean }>)
      .then((d) => alive && setState(!d.open ? "closed" : d.valid ? "valid" : "invalid"))
      .catch(() => alive && setState("closed"));
    return () => {
      alive = false;
    };
  }, [code]);
  return state;
}

/** How the tester will appear in the app, updated as they type. */
function Preview({ photo, name, username, big }: { photo: string | null; name: string; username: string; big?: boolean }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  return (
    <div className={cn("flex items-center gap-3.5 rounded-2xl border border-line bg-surface", big ? "p-5" : "p-4")}>
      <span className={cn("relative shrink-0 overflow-hidden rounded-full bg-[linear-gradient(135deg,#8b7cf6,#cdf564)] ring-2 ring-accent/60", big ? "h-16 w-16" : "h-12 w-12")}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[15px] font-bold text-on-accent">{initials}</span>
        )}
      </span>
      <div className="min-w-0">
        <p className={cn("truncate font-semibold text-fg", big ? "text-[18px]" : "text-[15px]")}>{name.trim() || "Your name"}</p>
        <p className="truncate text-[13.5px] text-brand-300">@{username.trim().replace(/^@+/, "") || "username"}</p>
      </div>
      <Heart className="ml-auto h-4 w-4 shrink-0 fill-[#ff5a6e] text-[#ff5a6e]" aria-hidden="true" />
    </div>
  );
}

export function TesterSignup() {
  const code = useSearchParams().get("invite")?.trim() ?? "";
  const invite = useInvite(code);
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ name: "", username: "", email: "" });
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    setStatus({ kind: "idle" });
    try {
      setPhoto(await shrinkPhoto(file));
    } catch (err) {
      setStatus({ kind: "error", message: (err as Error).message });
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!photo) return setStatus({ kind: "error", message: "Please add a profile photo." });
    setStatus({ kind: "sending" });
    try {
      const res = await apiFetch("/api/testers/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...f, photo, invite: code, website: new FormData(e.currentTarget).get("website") ?? "" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(res.status === 429 ? "Too many tries just now. Please wait a little and try again." : data.error ?? "Couldn't save your details. Please try again.");
      }
      setStatus({ kind: "done" });
    } catch (err) {
      setStatus({ kind: "error", message: (err as Error).message });
    }
  };

  return (
    <div className="relative isolate min-h-dvh bg-app text-fg">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_40%_at_50%_0%,rgb(92_77_204/0.25),transparent_70%),radial-gradient(rgb(255_255_255/0.04)_1px,transparent_1px)] [background-size:auto,24px_24px]" />
      <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-4 py-8">
        <div className="flex items-center gap-2.5 font-display text-[17px] font-bold tracking-[-0.02em]">
          <Logo className="h-7 w-7" /> Fusion Office
        </div>

        {invite === "checking" ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-fg-subtle" aria-label="Checking your invite" />
          </div>
        ) : invite !== "valid" ? (
          <div className="fo-palette-in my-auto rounded-[26px] border border-line-strong bg-surface p-7 text-center shadow-pop">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-raised text-accent ring-1 ring-inset ring-line-strong">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="mt-4 font-display text-[22px] font-bold tracking-[-0.02em]">{invite === "closed" ? "Sign-up isn't open right now" : "This page is for invited testers"}</h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-fg-muted">
              {invite === "closed" ? "Please try again a little later." : "Please open the full invite link you were sent. If it still doesn't work, ask the Fusion Office team for a new one."}
            </p>
          </div>
        ) : status.kind === "done" ? (
          <div className="fo-palette-in my-auto text-center" role="status">
            <span className="fo-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent shadow-[0_0_30px_rgb(205_245_100/0.55)]">
              <Heart className="h-7 w-7 fill-[#14152b] text-[#14152b]" aria-hidden="true" />
            </span>
            <h1 className="mt-5 font-display text-[26px] font-bold tracking-[-0.02em]">Thank you, {f.name.trim().split(" ")[0]}!</h1>
            <p className="mx-auto mt-2 max-w-[36ch] text-[15px] leading-relaxed text-fg-muted">
              You helped shape Fusion Office before anyone else saw it. This is how you&apos;ll appear on the Special thanks screen in the app:
            </p>
            <div className="mt-6 text-left">
              <Preview photo={photo} name={f.name} username={f.username} big />
            </div>
            <p className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-fg-subtle">
              <Smartphone className="h-3.5 w-3.5" aria-hidden="true" /> Settings → Special thanks
            </p>
          </div>
        ) : (
          <>
            <header className="mt-10">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">Early testers</p>
              <h1 className="mt-2 font-display text-[30px] font-extrabold leading-[1.08] tracking-[-0.03em]">Thank you for testing Fusion Office</h1>
              <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">
                Add your details and a photo, and we&apos;ll thank you by name on the Special thanks screen in the mobile app.
              </p>
            </header>

            <form noValidate onSubmit={submit} className="mt-7 space-y-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="fo-press group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-line-strong bg-sunken transition-colors hover:border-brand-500"
                  aria-label={photo ? "Change your photo" : "Add your photo"}
                >
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="Your photo" className="h-full w-full object-cover" />
                  ) : photoBusy ? (
                    <Loader2 className="h-6 w-6 animate-spin text-fg-subtle" aria-hidden="true" />
                  ) : (
                    <Camera className="h-7 w-7 text-fg-subtle transition-colors group-hover:text-brand-300" aria-hidden="true" />
                  )}
                </button>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold">Profile photo</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">A clear photo of your face works best. We compress it to a small square after upload.</p>
                  <button type="button" onClick={() => fileRef.current?.click()} className="mt-1.5 text-[13.5px] font-semibold text-brand-300 hover:text-brand-200">
                    {photo ? "Change photo" : "Choose photo"}
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
              </div>

              <div>
                <label htmlFor={`${id}-name`} className="block text-[13px] font-medium">Name</label>
                <input id={`${id}-name`} value={f.name} onChange={set("name")} autoComplete="name" maxLength={60} required placeholder="Priya Sharma" className={cn(input, "mt-1.5")} />
              </div>
              <div>
                <label htmlFor={`${id}-username`} className="block text-[13px] font-medium">Username</label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-fg-subtle">@</span>
                  <input
                    id={`${id}-username`}
                    value={f.username}
                    onChange={set("username")}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={31}
                    required
                    placeholder="priya.sharma"
                    className={cn(input, "pl-8")}
                  />
                </div>
                <p className="mt-1 text-[12.5px] text-fg-subtle">Letters, numbers, dots and underscores.</p>
              </div>
              <div>
                <label htmlFor={`${id}-email`} className="block text-[13px] font-medium">
                  Email <span className="font-normal text-fg-subtle">· private, never shown</span>
                </label>
                <input id={`${id}-email`} type="email" value={f.email} onChange={set("email")} autoComplete="email" inputMode="email" required placeholder="you@example.com" className={cn(input, "mt-1.5")} />
              </div>
              <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Preview in the app</p>
                <Preview photo={photo} name={f.name} username={f.username} />
              </div>

              {status.kind === "error" && (
                <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-300 ring-1 ring-inset ring-red-500/25">
                  {status.message}
                </p>
              )}

              <button type="submit" disabled={status.kind === "sending" || photoBusy} className="btn btn-primary btn-lg w-full disabled:opacity-50">
                {status.kind === "sending" ? "Saving…" : "Add me to Special thanks"}
              </button>
              <p className="text-center text-[12.5px] leading-relaxed text-fg-subtle">
                Your name, username and photo will be shown in the Fusion Office app. Your email is only used to contact you about testing.
              </p>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
