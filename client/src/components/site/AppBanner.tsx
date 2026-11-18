import { Logo } from "../Logo";

/**
 * Mobile app banner at the top of the footer. The Android app is live on
 * Google Play; the App Store badge says "Coming soon" until the iPhone app is.
 */
const PLAY_URL = "https://play.google.com/store/apps/details?id=in.nextgenfusion.fusionoffice";

export function AppBanner() {
  return (
    <section aria-labelledby="app-banner-title" className="px-4 pt-12 sm:px-6 lg:px-8">
      <div className="relative isolate overflow-hidden rounded-[28px] border border-white/10 bg-[#0e1027] px-6 py-10 sm:px-10 md:py-12 lg:px-14">
        {/* Violet and lime glows over a faint dot grid. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(45%_70%_at_8%_0%,rgb(139_124_246/0.32),transparent_70%),radial-gradient(40%_60%_at_95%_100%,rgb(205_245_100/0.18),transparent_70%),radial-gradient(rgb(255_255_255/0.06)_1px,transparent_1px)] [background-size:auto,auto,22px_22px]"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-[linear-gradient(90deg,transparent,rgb(182_173_255/0.6),rgb(205_245_100/0.5),transparent)]" />

        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_400px] md:gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="max-w-[560px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-accent">
              <span className="relative flex h-2 w-2">
                <span className="fo-ping absolute inset-0 rounded-full bg-accent" />
                <span className="relative h-2 w-2 rounded-full bg-accent" />
              </span>
              Now on Android
            </span>
            <h2 id="app-banner-title" className="mt-5 text-balance font-display text-[clamp(1.75rem,3.6vw,2.6rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-white">
              Fusion Office, <span className="bg-[linear-gradient(90deg,#9d91fb,#cdf564)] bg-clip-text text-transparent">now in your pocket.</span>
            </h2>
            <p className="mt-4 max-w-[48ch] text-[15.5px] leading-relaxed text-white/70">
              Scan, sign, compress and convert from your phone, with the same private, on-device processing. Get the Android app on Google Play; the iPhone app is on its way.
            </p>

            <ul className="mt-6 flex flex-wrap gap-2 text-[13px] text-white/80">
              {["Scan & sign on the go", "Files stay on your phone", "Free, like the web app"].map((f) => (
                <li key={f} className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 ring-1 ring-inset ring-white/10">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-accent" fill="none" aria-hidden="true">
                    <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 min-[480px]:flex-row min-[480px]:flex-wrap">
              <StoreBadge store="apple" />
              <StoreBadge store="google" />
            </div>
          </div>

          <PhoneMock />
        </div>
      </div>
    </section>
  );
}

function StoreBadge({ store }: { store: "apple" | "google" }) {
  const apple = store === "apple";
  const Tag = apple ? "div" : "a";
  return (
    <Tag
      {...(apple
        ? { role: "img", "aria-label": "App Store: coming soon" }
        : { href: PLAY_URL, target: "_blank", rel: "noopener noreferrer", "aria-label": "Get it on Google Play" })}
      className="group relative flex h-[58px] w-full items-center gap-2.5 min-[480px]:w-auto min-[480px]:min-w-[164px] rounded-[14px] bg-black px-3.5 ring-1 ring-white/20 transition-[translate,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgb(139_124_246/0.6)]"
    >
      {apple ? (
        <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" aria-hidden="true">
          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
          <defs>
            <linearGradient id="play-badge" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#00d2ff" />
              <stop offset=".35" stopColor="#00f076" />
              <stop offset=".7" stopColor="#ffd400" />
              <stop offset="1" stopColor="#ff3a44" />
            </linearGradient>
          </defs>
          <path
            fill="url(#play-badge)"
            d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z"
          />
        </svg>
      )}
      <span className="flex flex-col leading-none text-white">
        <span className="text-[10.5px] font-medium tracking-[0.02em] text-white/70">{apple ? "Coming soon on the" : "GET IT ON"}</span>
        <span className="mt-1 text-[18px] font-semibold tracking-[-0.01em]">{apple ? "App Store" : "Google Play"}</span>
      </span>
      {apple && (
        <span className="absolute -right-2 -top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-on-accent shadow-[0_0_12px_rgb(205_245_100/0.5)]">Soon</span>
      )}
    </Tag>
  );
}

/* ── Realistic phone mock-up (pure CSS/SVG, so it stays sharp and light) ── */

/** iPhone-style status bar: time, signal, Wi-Fi, battery. */
function StatusBar() {
  return (
    <div className="flex h-[30px] items-center justify-between px-[22px] pt-1.5 text-white">
      <span className="text-[11px] font-semibold tracking-tight">9:41</span>
      <span className="flex items-center gap-[5px]">
        <svg viewBox="0 0 18 12" className="h-[9px] w-[14px] fill-white"><rect x="0" y="8" width="3" height="4" rx=".8" /><rect x="5" y="5.5" width="3" height="6.5" rx=".8" /><rect x="10" y="3" width="3" height="9" rx=".8" /><rect x="15" y="0" width="3" height="12" rx=".8" /></svg>
        <svg viewBox="0 0 16 12" className="h-[9px] w-[12px] fill-white"><path d="M8 2.4c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.6 10.6 0 0 0 8 .6 10.6 10.6 0 0 0 .5 3.6l1.2 1.3A8.8 8.8 0 0 1 8 2.4Zm0 3.6c1.4 0 2.7.5 3.7 1.4l1.2-1.3A7.2 7.2 0 0 0 8 4.2 7.2 7.2 0 0 0 3.1 6.1l1.2 1.3c1-.9 2.3-1.4 3.7-1.4Zm0 3.5c-.6 0-1.2.2-1.6.6L8 11.8l1.6-1.7c-.4-.4-1-.6-1.6-.6Z" /></svg>
        <span className="relative flex h-[10px] w-[20px] items-center rounded-[3px] border border-white/45 p-[1.5px]">
          <span className="h-full w-[72%] rounded-[1.5px] bg-white" />
          <span className="absolute -right-[2.5px] top-1/2 h-[4px] w-[1.5px] -translate-y-1/2 rounded-r-sm bg-white/45" />
        </span>
      </span>
    </div>
  );
}

/** Frame, side buttons, Dynamic Island, glass glare and home indicator around a screen. */
function Device({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`relative h-[440px] w-[214px] ${className}`} style={style}>
      {/* Side buttons */}
      <span className="absolute -left-[3px] top-[86px] h-[22px] w-[3px] rounded-l-sm bg-[#3a3d52]" />
      <span className="absolute -left-[3px] top-[122px] h-[40px] w-[3px] rounded-l-sm bg-[#3a3d52]" />
      <span className="absolute -left-[3px] top-[170px] h-[40px] w-[3px] rounded-l-sm bg-[#3a3d52]" />
      <span className="absolute -right-[3px] top-[140px] h-[62px] w-[3px] rounded-r-sm bg-[#3a3d52]" />
      {/* Titanium frame */}
      <div className="h-full w-full rounded-[44px] bg-[linear-gradient(145deg,#5b5f78,#23253a_35%,#14152a_60%,#4a4d66)] p-[3px] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.95),0_0_0_1px_rgb(255_255_255/0.08)]">
        <div className="h-full w-full rounded-[41px] bg-black p-[6px]">
          <div className="relative h-full w-full overflow-hidden rounded-[35px] bg-[#0a0c11]">
            {children}
            {/* Dynamic Island */}
            <div className="absolute left-1/2 top-[9px] flex h-[22px] w-[74px] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-2.5">
              <span className="h-[7px] w-[7px] rounded-full bg-[radial-gradient(circle_at_35%_35%,#3b3f5c,#0b0c14)]" />
            </div>
            {/* Home indicator */}
            <span className="absolute bottom-[6px] left-1/2 h-[4px] w-[78px] -translate-x-1/2 rounded-full bg-white/70" />
            {/* Glass glare */}
            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgb(255_255_255/0.10)_0%,transparent_28%,transparent_70%,rgb(255_255_255/0.04)_100%)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

const Icon = ({ d, className = "h-3 w-3" }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const I = {
  merge: "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3M8 12h8",
  shrink: "m15 15 6 6m-6-6v4.8m0-4.8h4.8M9 19.8V15m0 0H4.2M9 15l-6 6M15 4.2V9m0 0h4.8M15 9l6-6M9 4.2V9m0 0H4.2M9 9 3 3",
  image: "M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm6 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm12 6-5-5L5 21",
  home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  clock: "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
  search: "m21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z",
  share: "M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14",
};

/** The app's home screen, as in the real React Native app. */
function HomeScreen() {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_0%,#1d1a4a,#0a0c11_60%)] text-white">
      <StatusBar />
      <div className="px-3.5 pt-2.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-bold">
            <Logo className="h-4 w-4" /> Fusion Office
          </span>
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.06] ring-1 ring-white/10">
            <Icon d={I.search} className="h-3 w-3 text-white/80" />
          </span>
        </div>
        <p className="mt-3 font-display text-[19px] font-extrabold leading-[1.05] tracking-[-0.03em]">Your private file</p>
        <p className="font-display text-[19px] font-extrabold leading-[1.15] tracking-[-0.03em]">
          <span className="bg-[linear-gradient(90deg,#b6adff,#cdf564)] bg-clip-text text-transparent">workspace.</span>
        </p>
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-[#cdf564]/30 bg-[#cdf564]/10 px-1.5 py-[2px] text-[7.5px] font-semibold text-[#cdf564]">● Stays on this device</span>

        {/* Glowing drop card */}
        <div className="relative mt-3">
          <div className="absolute -inset-2 rounded-[20px] bg-[linear-gradient(100deg,#8b7cf6,#cdf564)] opacity-45 blur-lg" />
          <div className="relative rounded-[16px] bg-[linear-gradient(100deg,#9d91fb,#cfc8ff_48%,#cdf564)] p-[2px]">
            <div className="rounded-[14px] bg-[#f5f4f0] p-2 text-[#14152b]">
              <div className="flex flex-col items-center rounded-[10px] border border-dashed border-[#c4c2d4] py-2.5">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 12v6M9 15h6" /></svg>
                <span className="mt-1 text-[10px] font-extrabold">Choose a file</span>
                <span className="text-[6.5px] text-[#5d5f78]">Stays on this device</span>
              </div>
              <div className="mt-1.5 grid grid-cols-3 rounded-full bg-white p-[2px] text-center text-[7px] font-semibold ring-1 ring-[#e3e1ec]">
                <span className="rounded-full bg-[#151738] py-[3px] text-white">PDF</span>
                <span className="py-[3px] text-[#2b2d48]">Docs</span>
                <span className="py-[3px] text-[#2b2d48]">Images</span>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-2.5 text-[9px] font-bold">Quick actions</p>
        <div className="mt-1.5 grid grid-cols-4 gap-1">
          {[
            { bg: "#e5676a", fg: "#fff", icon: I.merge, label: "Merge PDF" },
            { bg: "#7a72f0", fg: "#fff", icon: I.shrink, label: "Compress PDF" },
            { bg: "#cdf564", fg: "#14152b", letter: "W", label: "PDF to Word" },
            { bg: "#b7a6f7", fg: "#14152b", icon: I.image, label: "Resize image" },
          ].map((q) => (
            <div key={q.label} className="flex flex-col items-center rounded-[9px] border border-white/[0.07] bg-white/[0.04] px-0.5 py-1.5 text-center">
              <span className="flex h-6 w-6 items-center justify-center rounded-[7px]" style={{ background: q.bg, color: q.fg }}>
                {q.icon ? <Icon d={q.icon} className="h-3.5 w-3.5" /> : <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border-[1.5px] border-current text-[7px] font-extrabold">{q.letter}</span>}
              </span>
              <p className="mt-1 text-[5.5px] font-semibold leading-tight">{q.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar with the raised + button */}
      <div className="absolute inset-x-2 bottom-[16px]">
        <div className="relative flex h-[38px] items-center justify-around rounded-[14px] border border-white/[0.08] bg-[#12151c]/95 px-1 backdrop-blur">
          {[
            { icon: I.home, label: "Home", on: true },
            { icon: I.grid, label: "Tools" },
            null,
            { icon: I.clock, label: "Recent" },
            { icon: I.gear, label: "Settings" },
          ].map((t, i) =>
            t ? (
              <span key={t.label} className={`flex flex-col items-center gap-[1px] text-[6px] font-semibold ${t.on ? "text-[#cdf564]" : "text-white/45"}`}>
                <Icon d={t.icon} className="h-3 w-3" />
                {t.label}
              </span>
            ) : (
              <span key={i} className="w-8" />
            ),
          )}
          <span className="absolute -top-3 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-[3px] border-[#0a0c11] bg-[#cdf564] text-[#0c0f06] shadow-[0_0_14px_rgb(205_245_100/0.55)]">
            <Icon d="M12 5v14M5 12h14" className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

/** The "Your file is ready" screen, shown on the phone behind. */
function DoneScreen() {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_10%,#232050,#0a0c11_65%)] text-white">
      <StatusBar />
      <div className="px-3.5 pt-4">
        <p className="text-[9px] text-white/55">Compress PDF</p>
        <div className="mt-3 rounded-[14px] bg-[#f5f4f0] p-2.5 text-center text-[#14152b]">
          <div className="flex items-center gap-1 rounded-[9px] bg-[#14152b] px-1.5 py-1 text-white">
            <span className="h-3.5 w-3.5 rounded-[4px] bg-white/10" />
            <span className="h-[2px] flex-1 rounded bg-[#cdf564]" />
            <span className="rounded-[4px] bg-[#2d2868] px-1 text-[5.5px]">On-device</span>
            <span className="h-[2px] flex-1 rounded bg-[#cdf564]" />
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] bg-[#cdf564] text-[6px] text-[#14152b]">✓</span>
          </div>
          <span className="mx-auto mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#cdf564] shadow-[0_0_18px_rgb(205_245_100/0.7)]">
            <Icon d="m5 12.5 4.5 4.5L19 7.5" className="h-5 w-5" />
          </span>
          <p className="mt-2 text-[11px] font-extrabold">Your file is ready</p>
          <div className="mt-2 flex items-center gap-1.5 rounded-[8px] bg-white p-1.5 text-left ring-1 ring-[#e3e1ec]">
            <span className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-[#14152b] text-[5px] font-bold text-[#cdf564]">PDF</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[7px] font-semibold">report-compressed.pdf</span>
              <span className="block text-[6px] font-semibold text-[#3f7d12]">1.2 MB · 62% smaller</span>
            </span>
          </div>
          <span className="mt-2 flex h-6 items-center justify-center gap-1 rounded-full bg-[#151738] text-[7.5px] font-semibold text-white">
            <Icon d={I.share} className="h-2.5 w-2.5" /> Save or share PDF
          </span>
        </div>
        <p className="mt-3 text-center text-[7px] font-semibold text-[#cdf564]">0 files uploaded</p>
      </div>
    </div>
  );
}

/** Two phones: the home screen in front, a finished job behind, with floating proof chips. */
function PhoneMock() {
  return (
    <div aria-hidden="true" className="relative mx-auto hidden h-[480px] w-[400px] max-w-full sm:block">
      <div className="absolute bottom-0 left-1/2 h-12 w-[260px] -translate-x-1/2 rounded-full bg-[#8b7cf6]/35 blur-3xl" />
      <div className="absolute bottom-6 left-[60%] h-20 w-40 rounded-full bg-[#cdf564]/15 blur-3xl" />
      <div className="absolute -right-2 top-0 rotate-[10deg] scale-[0.88] [filter:brightness(0.82)]">
        <Device>
          <DoneScreen />
        </Device>
      </div>
      <div className="fo-float-sm absolute left-4 top-6 z-10">
        <Device className="-rotate-[4deg]">
          <HomeScreen />
        </Device>
      </div>
      {/* Floating proof chips */}
      <div className="absolute -left-4 top-[200px] z-20 flex items-center gap-1.5 rounded-full bg-[#14152b]/90 px-3 py-1.5 text-[11px] font-semibold text-[#cdf564] shadow-[0_10px_24px_-10px_rgb(0_0_0/0.9)] ring-1 ring-[#cdf564]/30 backdrop-blur">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5"><path d="M12 2 4 5v6c0 5.1 3.4 9.4 8 11 4.6-1.6 8-5.9 8-11V5z" fill="#cdf564" /><path d="m8.4 12.2 2.5 2.5 4.7-5" stroke="#0c0f06" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
        0 files uploaded
      </div>
      <div className="absolute right-0 bottom-[70px] z-20 flex items-center gap-1.5 rounded-full bg-[#14152b]/90 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_10px_24px_-10px_rgb(0_0_0/0.9)] ring-1 ring-white/15 backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-[#cdf564] shadow-[0_0_8px_#cdf564]" /> 62% smaller in 2s
      </div>
    </div>
  );
}
