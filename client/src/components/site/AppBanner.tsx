import { Logo } from "../Logo";

/**
 * "Mobile apps coming soon" banner at the top of the footer. The store
 * badges are not links yet: they say "Coming soon" until the apps are live.
 */
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

        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_220px] md:gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="max-w-[560px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-accent">
              <span className="relative flex h-2 w-2">
                <span className="fo-ping absolute inset-0 rounded-full bg-accent" />
                <span className="relative h-2 w-2 rounded-full bg-accent" />
              </span>
              Coming soon
            </span>
            <h2 id="app-banner-title" className="mt-5 text-balance font-display text-[clamp(1.75rem,3.6vw,2.6rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-white">
              Fusion Office, <span className="bg-[linear-gradient(90deg,#9d91fb,#cdf564)] bg-clip-text text-transparent">now in your pocket.</span>
            </h2>
            <p className="mt-4 max-w-[48ch] text-[15.5px] leading-relaxed text-white/70">
              Scan, sign, compress and convert from your phone, with the same private, on-device processing. The iPhone and Android apps are on their way.
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
  return (
    <div
      role="img"
      aria-label={apple ? "App Store: coming soon" : "Google Play: coming soon"}
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
        <span className="text-[10.5px] font-medium tracking-[0.02em] text-white/70">{apple ? "Coming soon on the" : "Coming soon on"}</span>
        <span className="mt-1 text-[18px] font-semibold tracking-[-0.01em]">{apple ? "App Store" : "Google Play"}</span>
      </span>
      <span className="absolute -right-2 -top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-on-accent shadow-[0_0_12px_rgb(205_245_100/0.5)]">Soon</span>
    </div>
  );
}

/** A phone showing the app's home screen, built in CSS so it stays sharp and light. */
function PhoneMock() {
  return (
    <div aria-hidden="true" className="relative mx-auto hidden h-[400px] w-[220px] sm:block">
      <div className="absolute inset-x-6 bottom-2 h-10 rounded-full bg-[#8b7cf6]/40 blur-2xl" />
      <div className="fo-float-sm relative mx-auto h-[392px] w-[196px] rotate-[6deg] rounded-[38px] bg-[linear-gradient(145deg,#2a2d4a,#14152b)] p-[7px] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.9),inset_0_0_0_1px_rgb(255_255_255/0.12)]">
        <div className="relative h-full overflow-hidden rounded-[31px] bg-[#0b0d1f]">
          <div className="absolute left-1/2 top-2 h-[18px] w-[72px] -translate-x-1/2 rounded-full bg-black" />
          <div className="absolute inset-0 bg-[radial-gradient(80%_50%_at_50%_45%,rgb(92_77_204/0.35),transparent_70%)]" />
          <div className="relative px-3.5 pt-9">
            <div className="flex items-center gap-1.5">
              <Logo className="h-4 w-4" />
              <span className="text-[10px] font-bold text-white">Fusion Office</span>
            </div>
            <p className="mt-4 font-display text-[15px] font-extrabold leading-[1.15] tracking-[-0.03em] text-white">
              All your files.
              <br />
              <span className="text-[#b6adff]">One private</span> <span className="text-accent">app.</span>
            </p>
            {/* Mini glowing drop card */}
            <div className="relative mt-5 rounded-[16px] bg-[linear-gradient(100deg,#9d91fb,#cfc8ff_48%,#cdf564)] p-[2px] shadow-[-6px_0_18px_rgb(139_124_246/0.55),6px_0_18px_rgb(205_245_100/0.4)]">
              <div className="flex flex-col items-center rounded-[14px] bg-[#f5f4f0] px-2 py-4 text-[#14152b]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M12 12v6M9 15h6" />
                </svg>
                <span className="mt-1.5 text-[11px] font-bold">Choose a file</span>
                <span className="mt-0.5 text-[8.5px] text-[#5d5f78]">Stays on this device</span>
              </div>
            </div>
            <p className="mt-4 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/50">Quick actions</p>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {["#e5676a", "#7a72f0", "#cdf564", "#b7a6f7"].map((c) => (
                <span key={c} className="aspect-square rounded-[9px]" style={{ background: c }} />
              ))}
            </div>
          </div>
          {/* Tab bar */}
          <div className="absolute inset-x-3 bottom-3 flex justify-around rounded-[14px] bg-white/[0.06] py-2 ring-1 ring-inset ring-white/10">
            {[true, false, false, false].map((on, i) => (
              <span key={i} className={on ? "h-1.5 w-5 rounded-full bg-accent" : "h-1.5 w-1.5 rounded-full bg-white/30"} />
            ))}
          </div>
        </div>
      </div>
      {/* Floating privacy chip */}
      <div className="absolute -left-8 top-[214px] flex items-center gap-1.5 rounded-full bg-[#14152b]/90 px-3 py-1.5 text-[11px] font-semibold text-accent shadow-[0_10px_24px_-10px_rgb(0_0_0/0.9)] ring-1 ring-accent/30 backdrop-blur">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
          <path d="M12 2 4 5v6c0 5.1 3.4 9.4 8 11 4.6-1.6 8-5.9 8-11V5z" fill="#cdf564" />
          <path d="m8.4 12.2 2.5 2.5 4.7-5" stroke="#0c0f06" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        0 files uploaded
      </div>
    </div>
  );
}
