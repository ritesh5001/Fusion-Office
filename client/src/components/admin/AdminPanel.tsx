"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, Eye, EyeOff, Heart, Inbox, Loader2, LockKeyhole, LogOut, Mail, MailOpen, MessageSquareHeart, RefreshCw, Search, Star, Trash2, Users } from "lucide-react";
import { Logo } from "../Logo";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

interface Item {
  id: string;
  kind: string;
  name: string;
  email: string | null;
  subject: string | null;
  message: string;
  rating: number | null;
  page: string | null;
  userAgent: string | null;
  read: boolean;
  starred: boolean;
  createdAt: string;
}
type Filter = "all" | "unread" | "starred";
type Kind = "feedback" | "contact" | "story";
const KINDS: { id: Kind; label: string; noun: string; icon: typeof Inbox }[] = [
  { id: "feedback", label: "Feedback", noun: "feedback", icon: MessageSquareHeart },
  { id: "contact", label: "Contact", noun: "messages", icon: Mail },
  { id: "story", label: "Stories", noun: "stories", icon: Heart },
];
type Session = { enabled: boolean; signedIn: boolean } | null;

const json = async <T,>(res: Response): Promise<T> => {
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status}).`);
  return body;
};

/** The feedback admin panel: sign in with the admin password, then read and manage feedback. */
export function AdminPanel() {
  const [session, setSession] = useState<Session>(null);

  const check = useCallback(() => {
    apiFetch("/api/admin/session")
      .then((r) => json<{ enabled: boolean; signedIn: boolean }>(r))
      .then(setSession)
      .catch(() => setSession({ enabled: false, signedIn: false }));
  }, []);
  useEffect(check, [check]);

  return (
    <div className="relative isolate min-h-dvh bg-app text-fg">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_40%_at_50%_0%,rgb(92_77_204/0.22),transparent_70%),radial-gradient(rgb(255_255_255/0.04)_1px,transparent_1px)] [background-size:auto,24px_24px]" />
      {session === null ? (
        <div className="flex min-h-dvh items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-fg-subtle" aria-label="Loading" />
        </div>
      ) : session.signedIn ? (
        <Inbox_ onSignOut={() => setSession({ ...session, signedIn: false })} />
      ) : (
        <Login enabled={session.enabled} onSignedIn={check} />
      )}
    </div>
  );
}

function Login({ enabled, onSignedIn }: { enabled: boolean; onSignedIn: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      if (res.status === 429) throw new Error("Too many attempts. Wait a few minutes and try again.");
      await json(res);
      onSignedIn();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form onSubmit={submit} className="fo-palette-in w-full max-w-[400px] rounded-[26px] border border-line-strong bg-surface p-7 shadow-pop">
        <div className="flex items-center gap-2.5 font-display text-[17px] font-bold tracking-[-0.02em]">
          <Logo className="h-7 w-7" /> Fusion Office
        </div>
        <span className="mt-6 flex h-11 w-11 items-center justify-center rounded-xl bg-raised text-accent ring-1 ring-inset ring-line-strong">
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-[24px] font-bold tracking-[-0.02em]">Admin sign in</h1>
        <p className="mt-1 text-[14px] text-fg-muted">Feedback, messages and stories for the Fusion Office team.</p>
        {!enabled ? (
          <p className="mt-5 rounded-xl bg-amber-500/10 px-3.5 py-3 text-[13.5px] text-amber-200 ring-1 ring-inset ring-amber-500/25">
            The admin panel isn&apos;t set up yet. Add <code className="font-mono">ADMIN_PASSWORD</code> to the server&apos;s environment.
          </p>
        ) : (
          <>
            <label htmlFor="admin-password" className="mt-5 block text-[13px] font-medium">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              required
              className="mt-1.5 h-11 w-full rounded-xl border border-line-strong bg-sunken px-3.5 text-[15px] text-fg outline-none transition focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/20"
            />
            {error && (
              <p role="alert" className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-300 ring-1 ring-inset ring-red-500/25">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy || !password} className="btn btn-primary btn-lg mt-5 w-full disabled:opacity-50">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </>
        )}
      </form>
    </main>
  );
}

const relative = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function Inbox_({ onSignOut }: { onSignOut: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [counts, setCounts] = useState({ total: 0, unread: 0, starred: 0 });
  const [filter, setFilter] = useState<Filter>("all");
  const [kind, setKind] = useState<Kind>("feedback");
  // The Testers tab replaces the inbox with the early-tester list.
  const [testersView, setTestersView] = useState(false);
  const [unreadByKind, setUnreadByKind] = useState<Record<string, number>>({});
  const noun = KINDS.find((k) => k.id === kind)!.noun;
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ kind, filter, ...(query.trim() ? { q: query.trim() } : {}) });
      const res = await apiFetch(`/api/admin/feedback?${qs}`);
      if (res.status === 401) return onSignOut();
      const data = await json<{ items: Item[]; counts: typeof counts; unreadByKind?: Record<string, number> }>(res);
      setItems(data.items);
      setCounts(data.counts);
      setUnreadByKind(data.unreadByKind ?? {});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [kind, filter, query, onSignOut]);

  // Search waits for a pause in typing.
  useEffect(() => {
    const t = window.setTimeout(load, query ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [load, query]);

  const update = async (item: Item, patch: Partial<Pick<Item, "read" | "starred">>) => {
    setItems((cur) => cur.map((x) => (x.id === item.id ? { ...x, ...patch } : x)));
    setCounts((c) => ({
      ...c,
      unread: c.unread + (patch.read === undefined ? 0 : patch.read ? -1 : 1),
      starred: c.starred + (patch.starred === undefined ? 0 : patch.starred ? 1 : -1),
    }));
    const res = await apiFetch(`/api/admin/feedback/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    if (!res.ok) load();
  };

  const remove = async (item: Item) => {
    if (!window.confirm(`Delete this from ${item.name}? This can't be undone.`)) return;
    setItems((cur) => cur.filter((x) => x.id !== item.id));
    const res = await apiFetch(`/api/admin/feedback/${item.id}`, { method: "DELETE" });
    load();
    if (!res.ok) setError("Couldn't delete that item.");
  };

  const signOut = async () => {
    await apiFetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    onSignOut();
  };

  const exportCsv = () => {
    const rows = [["Date", "Name", "Email", "Subject", "Rating", "Message", "Page", "Read", "Starred"], ...items.map((i) => [new Date(i.createdAt).toISOString(), i.name, i.email ?? "", i.subject ?? "", i.rating ?? "", i.message, i.page ?? "", i.read, i.starred])];
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fusion-office-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  };

  const average = useMemo(() => {
    const rated = items.filter((i) => i.rating);
    return rated.length ? (rated.reduce((n, i) => n + (i.rating ?? 0), 0) / rated.length).toFixed(1) : null;
  }, [items]);

  const tabs: { id: Filter; label: string; count: number; icon: typeof Inbox }[] = [
    { id: "all", label: "All", count: counts.total, icon: Inbox },
    { id: "unread", label: "Unread", count: counts.unread, icon: MailOpen },
    { id: "starred", label: "Starred", count: counts.starred, icon: Star },
  ];

  return (
    <div className="mx-auto max-w-[960px] px-4 pb-16 sm:px-6">
      <header className="flex items-center gap-3 py-5">
        <Logo className="h-7 w-7" />
        <div className="flex-1">
          <p className="font-display text-[17px] font-bold tracking-[-0.02em]">Inbox</p>
          <p className="text-[12.5px] text-fg-subtle">Fusion Office admin</p>
        </div>
        {!testersView && (
          <>
            <button type="button" onClick={load} className="btn btn-ghost btn-sm" aria-label="Refresh">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
            </button>
            <button type="button" onClick={exportCsv} disabled={!items.length} className="btn btn-ghost btn-sm disabled:opacity-40">
              <Download className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Export CSV</span>
            </button>
          </>
        )}
        <button type="button" onClick={signOut} className="btn btn-secondary btn-sm">
          <LogOut className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Sign out</span>
        </button>
      </header>

      <div role="tablist" aria-label="Inbox" className="mb-4 flex gap-1 rounded-2xl border border-line bg-surface p-1">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            role="tab"
            aria-selected={!testersView && kind === k.id}
            onClick={() => {
              setTestersView(false);
              setKind(k.id);
              setFilter("all");
            }}
            className={cn("fo-press inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold transition-colors", !testersView && kind === k.id ? "bg-raised text-fg ring-1 ring-inset ring-line-strong" : "text-fg-muted hover:text-fg")}
          >
            <k.icon className="h-4 w-4" aria-hidden="true" /> {k.label}
            {!!unreadByKind[k.id] && <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold tabular-nums text-on-accent">{unreadByKind[k.id]}</span>}
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={testersView}
          onClick={() => setTestersView(true)}
          className={cn("fo-press inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold transition-colors", testersView ? "bg-raised text-fg ring-1 ring-inset ring-line-strong" : "text-fg-muted hover:text-fg")}
        >
          <Users className="h-4 w-4" aria-hidden="true" /> Testers
        </button>
      </div>

      {testersView ? (
        <TestersAdmin onSignOut={onSignOut} />
      ) : (
      <>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: counts.total },
          { label: "Unread", value: counts.unread, accent: counts.unread > 0 },
          { label: "Starred", value: counts.starred },
          kind === "feedback" ? { label: "Avg. rating", value: average ?? "–" } : { label: "With email", value: items.filter((i) => i.email).length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">{s.label}</p>
            <p className={cn("mt-1 font-display text-[28px] font-bold tabular-nums tracking-[-0.02em]", s.accent ? "text-accent" : "text-fg")}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div role="tablist" aria-label="Filter" className="flex gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={filter === t.id}
              onClick={() => setFilter(t.id)}
              className={cn("fo-press inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors", filter === t.id ? "bg-fg text-app" : "text-fg-muted ring-1 ring-inset ring-line hover:bg-raised hover:text-fg")}
            >
              <t.icon className="h-3.5 w-3.5" aria-hidden="true" /> {t.label} <span className="tabular-nums opacity-60">{t.count}</span>
            </button>
          ))}
        </div>
        <label className="relative flex h-10 w-full items-center rounded-xl border border-line-strong bg-surface focus-within:border-brand-500 sm:flex-1">
          <Search className="ml-3 h-4 w-4 text-fg-subtle" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or message" aria-label="Search" className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-[14px] text-fg outline-none placeholder:text-fg-subtle" />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-[14px] text-red-300 ring-1 ring-inset ring-red-500/25">
          {error}
        </p>
      )}

      <ul className="mt-5 space-y-3">
        {items.map((i) => (
          <li key={i.id} className={cn("rounded-2xl border bg-surface p-5 transition-colors", i.read ? "border-line" : "border-brand-500/40 shadow-[0_0_0_1px_rgb(139_124_246/0.15)]")}>
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#8b7cf6,#cdf564)] text-[13px] font-bold text-on-accent">
                {i.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-[15px] font-semibold text-fg">{i.name}</p>
                  {!i.read && <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[11px] font-semibold text-brand-200">New</span>}
                  {i.rating && (
                    <span className="inline-flex items-center gap-0.5" aria-label={`${i.rating} out of 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={cn("h-3.5 w-3.5", n <= i.rating! ? "fill-accent text-accent" : "text-fg-subtle")} aria-hidden="true" />
                      ))}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[12.5px] text-fg-subtle" title={new Date(i.createdAt).toLocaleString("en-IN")}>
                  {relative(i.createdAt)}
                  {i.page && <> · from <span className="font-mono">{i.page}</span></>}
                </p>
                {i.email && (
                  <a href={`mailto:${i.email}${i.subject ? `?subject=${encodeURIComponent(`Re: ${i.subject}`)}` : ""}`} className="mt-0.5 inline-flex items-center gap-1 text-[13px] font-medium text-brand-300 hover:text-brand-200">
                    <Mail className="h-3.5 w-3.5" aria-hidden="true" /> {i.email}
                  </a>
                )}
              </div>
              <div className="flex shrink-0 gap-0.5">
                <IconButton label={i.starred ? "Unstar" : "Star"} onClick={() => update(i, { starred: !i.starred })}>
                  <Star className={cn("h-4 w-4", i.starred && "fill-accent text-accent")} aria-hidden="true" />
                </IconButton>
                <IconButton label={i.read ? "Mark as unread" : "Mark as read"} onClick={() => update(i, { read: !i.read })}>
                  <MailOpen className={cn("h-4 w-4", !i.read && "text-brand-300")} aria-hidden="true" />
                </IconButton>
                <IconButton label="Delete" onClick={() => remove(i)} danger>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </IconButton>
              </div>
            </div>
            {i.subject && <p className="mt-3 text-[14px] font-semibold text-fg">{i.subject}</p>}
            <p className={cn("whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-fg-muted", i.subject ? "mt-1" : "mt-3")}>{i.message}</p>
          </li>
        ))}
      </ul>

      {!loading && !items.length && !error && (
        <div className="mt-10 flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-raised ring-1 ring-inset ring-line-strong">
            <Inbox className="h-6 w-6 text-fg-muted" aria-hidden="true" />
          </span>
          <p className="mt-4 text-[16px] font-semibold">{query ? `No ${noun} match your search` : filter === "all" ? `No ${noun} yet` : `No ${filter} ${noun}`}</p>
          <p className="mt-1 text-[14px] text-fg-muted">{kind === "feedback" ? "Feedback sent from the website appears here." : kind === "contact" ? "Messages from the Contact us page appear here." : "Stories shared on the Pay it forward page appear here."}</p>
        </div>
      )}
      </>
      )}
    </div>
  );
}

interface Tester {
  id: string;
  name: string;
  username: string;
  email: string;
  visible: boolean;
  joinedAt: string;
}

/** Early testers shown on the app's Special thanks screen: the invite link to share, and who signed up. */
function TestersAdmin({ onSignOut }: { onSignOut: () => void }) {
  const [testers, setTesters] = useState<Tester[]>([]);
  const [invite, setInvite] = useState<{ path: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/admin/testers");
      if (res.status === 401) return onSignOut();
      const data = await json<{ invite: { path: string } | null; testers: Tester[] }>(res);
      setTesters(data.testers);
      setInvite(data.invite);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [onSignOut]);
  useEffect(() => {
    load();
  }, [load]);

  const link = invite ? `${window.location.origin}${invite.path}` : "";
  const copy = async () => {
    await navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const toggle = async (t: Tester) => {
    setTesters((cur) => cur.map((x) => (x.id === t.id ? { ...x, visible: !t.visible } : x)));
    const res = await apiFetch(`/api/admin/testers/${t.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ visible: !t.visible }) });
    if (!res.ok) load();
  };

  const remove = async (t: Tester) => {
    if (!window.confirm(`Remove ${t.name} (@${t.username}) from Special thanks? They can sign up again with the invite link.`)) return;
    setTesters((cur) => cur.filter((x) => x.id !== t.id));
    const res = await apiFetch(`/api/admin/testers/${t.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Couldn't remove that tester.");
      load();
    }
  };

  const shown = testers.filter((t) => t.visible).length;

  return (
    <div>
      <section className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">Invite link</p>
        {invite ? (
          <>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input readOnly value={link} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} className="h-10 min-w-0 flex-1 rounded-xl border border-line-strong bg-sunken px-3 font-mono text-[13px] text-fg outline-none" />
              <button type="button" onClick={copy} className="btn btn-primary btn-sm">
                {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />} {copied ? "Copied" : "Copy link"}
              </button>
            </div>
            <p className="mt-2 text-[13px] text-fg-muted">Send this only to your testers. The page isn&apos;t linked anywhere or indexed, and sign-up needs this exact link. To retire it, set a new TESTER_INVITE_CODE on the server.</p>
          </>
        ) : (
          <p className="mt-2 text-[13.5px] text-amber-200">Sign-up is closed: the server has no AUTH_SECRET or TESTER_INVITE_CODE.</p>
        )}
      </section>

      <div className="mt-5 flex items-center gap-3">
        <p className="flex-1 text-[14px] text-fg-muted">
          <span className="font-semibold text-fg tabular-nums">{testers.length}</span> signed up · <span className="tabular-nums">{shown}</span> shown in the app
        </p>
        <button type="button" onClick={load} className="btn btn-ghost btn-sm" aria-label="Refresh testers">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-[14px] text-red-300 ring-1 ring-inset ring-red-500/25">
          {error}
        </p>
      )}

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {testers.map((t) => (
          <li key={t.id} className={cn("flex items-center gap-3 rounded-2xl border bg-surface p-4", t.visible ? "border-line" : "border-dashed border-line-strong opacity-60")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/admin/testers/${t.id}/photo`} alt="" className="h-12 w-12 shrink-0 rounded-full bg-raised object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{t.name}</p>
              <p className="truncate text-[13px] text-brand-300">@{t.username}</p>
              <a href={`mailto:${t.email}`} className="block truncate text-[12.5px] text-fg-subtle hover:text-fg-muted">
                {t.email}
              </a>
              <p className="text-[12px] text-fg-subtle" title={new Date(t.joinedAt).toLocaleString("en-IN")}>
                Joined {relative(t.joinedAt)}
                {!t.visible && " · hidden"}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-0.5">
              <IconButton label={t.visible ? "Hide from the app" : "Show in the app"} onClick={() => toggle(t)}>
                {t.visible ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
              </IconButton>
              <IconButton label="Remove" onClick={() => remove(t)} danger>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </IconButton>
            </div>
          </li>
        ))}
      </ul>

      {!loading && !testers.length && !error && (
        <div className="mt-10 flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-raised ring-1 ring-inset ring-line-strong">
            <Users className="h-6 w-6 text-fg-muted" aria-hidden="true" />
          </span>
          <p className="mt-4 text-[16px] font-semibold">No testers yet</p>
          <p className="mt-1 text-[14px] text-fg-muted">Share the invite link; people who sign up appear here and in the app.</p>
        </div>
      )}
    </div>
  );
}

function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn("fo-press flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-raised", danger ? "hover:text-red-300" : "hover:text-fg")}
    >
      {children}
    </button>
  );
}
