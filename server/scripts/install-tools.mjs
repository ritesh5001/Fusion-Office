#!/usr/bin/env node
/**
 * Installs the converters (LibreOffice for Office → PDF, a headless Chrome for
 * HTML → PDF) into server/.tools when the backend is built on a host without
 * them, such as Render's Node runtime, where apt-get isn't available. The
 * Docker image installs both system-wide, so this is skipped there.
 *
 * Runs from postinstall, only on Render (RENDER is set) or with
 * INSTALL_TOOLS=1. A failure here only logs a warning: the rest of the API
 * still deploys, and the converters answer "not available" until fixed.
 *
 * Env: INSTALL_TOOLS=0 to skip, LIBREOFFICE_VERSION to pin a version.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const TOOLS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.tools");
const PATHS = path.join(TOOLS, "paths.json");
const MIRROR = "https://download.documentfoundation.org/libreoffice/stable";

const log = (msg) => console.log(`[install-tools] ${msg}`);

const onPath = (cmd) => spawnSync("sh", ["-c", `command -v ${cmd}`], { encoding: "utf8" }).stdout.trim();

function readPaths() {
  try {
    return JSON.parse(readFileSync(PATHS, "utf8"));
  } catch {
    return {};
  }
}

/** First file named `name` under `dir` whose path matches `test`. */
function find(dir, name, test = () => true) {
  if (!existsSync(dir)) return "";
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const hit = find(p, name, test);
      if (hit) return hit;
    } else if (entry.name === name && test(p)) return p;
  }
  return "";
}

/** Newest stable release, preferring one with a few bug-fix releases behind it. */
async function libreOfficeVersion() {
  if (process.env.LIBREOFFICE_VERSION) return process.env.LIBREOFFICE_VERSION;
  const html = await (await fetch(`${MIRROR}/`)).text();
  const versions = [...new Set([...html.matchAll(/href="(\d+\.\d+\.\d+)\/"/g)].map((m) => m[1]))].sort((a, b) => {
    const [x, y] = [a, b].map((v) => v.split(".").map(Number));
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  });
  if (!versions.length) throw new Error("no LibreOffice versions listed");
  return [...versions].reverse().find((v) => Number(v.split(".")[2]) >= 2) ?? versions.at(-1);
}

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`${url} answered ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(file));
}

/** Unpack a .deb without root: dpkg-deb when present, else ar + tar. */
function extractDeb(deb, dest, work) {
  if (onPath("dpkg-deb")) {
    execFileSync("dpkg-deb", ["-x", deb, dest]);
    return;
  }
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  execFileSync("ar", ["x", deb], { cwd: work });
  const data = readdirSync(work).find((f) => f.startsWith("data.tar"));
  if (!data) throw new Error(`no data archive in ${path.basename(deb)}`);
  execFileSync("tar", ["-xf", path.join(work, data), "-C", dest]);
}

async function installLibreOffice() {
  const existing = readPaths().soffice;
  if (existing && existsSync(existing)) return existing;
  const version = await libreOfficeVersion();
  const url = `${MIRROR}/${version}/deb/x86_64/LibreOffice_${version}_Linux_x86-64_deb.tar.gz`;
  const dir = path.join(TOOLS, "libreoffice");
  const tmp = path.join(TOOLS, "tmp");
  rmSync(dir, { recursive: true, force: true });
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  mkdirSync(dir, { recursive: true });

  log(`downloading LibreOffice ${version} (about 200 MB)…`);
  const archive = path.join(tmp, "lo.tar.gz");
  await download(url, archive);
  execFileSync("tar", ["-xzf", archive, "-C", tmp]);
  rmSync(archive);

  // Help, language, desktop-integration and database packages aren't needed to convert.
  const skip = /(helppack|langpack|dict-|kde|gnome|gtk|qt\d|kf\d|-base|report-builder|onlineupdate)/i;
  const debs = [];
  (function collect(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) collect(p);
      else if (e.name.endsWith(".deb") && !skip.test(e.name)) debs.push(p);
    }
  })(tmp);
  if (!debs.length) throw new Error("no .deb packages in the LibreOffice archive");
  log(`unpacking ${debs.length} packages…`);
  for (const deb of debs) extractDeb(deb, dir, path.join(tmp, "ar"));
  rmSync(tmp, { recursive: true, force: true });

  const soffice = find(dir, "soffice", (p) => p.includes(`${path.sep}program${path.sep}`));
  if (!soffice) throw new Error("soffice not found after unpacking");
  return soffice;
}

async function installChrome() {
  const existing = readPaths().chrome;
  if (existing && existsSync(existing)) return existing;
  const { Browser, BrowserPlatform, detectBrowserPlatform, install, resolveBuildId } = await import("@puppeteer/browsers");
  const platform = process.env.INSTALL_TOOLS_PLATFORM ?? detectBrowserPlatform() ?? BrowserPlatform.LINUX;
  const browser = Browser.CHROMEHEADLESSSHELL;
  const buildId = await resolveBuildId(browser, platform, "stable");
  log(`downloading Chrome headless shell ${buildId}…`);
  const installed = await install({ browser, buildId, platform, cacheDir: path.join(TOOLS, "chrome") });
  return installed.executablePath;
}

/** On the build host itself: report missing system libraries and try a real conversion. */
function selfTest(paths) {
  if (process.platform !== "linux") return;
  const missing = (bin) =>
    onPath("ldd") && existsSync(bin)
      ? [...spawnSync("ldd", [bin], { encoding: "utf8" }).stdout.matchAll(/^\s*(\S+) => not found/gm)].map((m) => m[1])
      : [];
  if (paths.soffice) {
    const program = path.dirname(paths.soffice);
    const libs = [...new Set([...missing(path.join(program, "soffice.bin")), ...missing(path.join(program, "libmergedlo.so"))])];
    if (libs.length) console.warn(`[install-tools] LibreOffice is missing system libraries: ${libs.join(", ")}`);
    const dir = path.join(TOOLS, "selftest");
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "test.csv"), "a,b\n1,2\n");
    const r = spawnSync(
      paths.soffice,
      [`-env:UserInstallation=file://${dir}/profile`, "--headless", "--norestore", "--convert-to", "pdf", "--outdir", dir, path.join(dir, "test.csv")],
      { encoding: "utf8", timeout: 180_000, env: { ...process.env, HOME: dir } },
    );
    if (existsSync(path.join(dir, "test.pdf"))) log("self-test: LibreOffice converted a file to PDF");
    else console.warn(`[install-tools] self-test: LibreOffice failed (${r.status ?? r.error?.message}): ${(r.stderr || "").slice(-800)}`);
    rmSync(dir, { recursive: true, force: true });
  }
  if (paths.chrome) {
    const libs = missing(paths.chrome);
    if (libs.length) console.warn(`[install-tools] Chrome is missing system libraries: ${libs.join(", ")}`);
    else log("self-test: Chrome has all its libraries");
  }
}

async function main() {
  const flag = process.env.INSTALL_TOOLS;
  if (flag === "0" || (!process.env.RENDER && flag !== "1")) return;
  const force = flag === "1";
  if (!force && (process.platform !== "linux" || process.arch !== "x64")) {
    log(`skipped: no prebuilt converters for ${process.platform}/${process.arch}`);
    return;
  }
  mkdirSync(TOOLS, { recursive: true });
  const paths = readPaths();

  const systemSoffice = process.env.SOFFICE_PATH || onPath("soffice") || onPath("libreoffice");
  if (systemSoffice && !force) log(`LibreOffice already installed: ${systemSoffice}`);
  else {
    try {
      paths.soffice = await installLibreOffice();
      log(`LibreOffice ready: ${paths.soffice}`);
    } catch (err) {
      console.warn(`[install-tools] LibreOffice not installed: ${err.message}`);
    }
  }

  const systemChrome = process.env.CHROME_PATH || onPath("chromium") || onPath("chromium-browser") || onPath("google-chrome");
  if (systemChrome && !force) log(`Chrome already installed: ${systemChrome}`);
  else {
    try {
      paths.chrome = await installChrome();
      log(`Chrome ready: ${paths.chrome}`);
    } catch (err) {
      console.warn(`[install-tools] Chrome not installed: ${err.message}`);
    }
  }

  writeFileSync(PATHS, JSON.stringify(paths, null, 2));
  log(`wrote ${PATHS}`);
  selfTest(paths);
}

main().catch((err) => console.warn(`[install-tools] ${err.message}`));
