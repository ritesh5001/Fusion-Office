import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Converters installed by scripts/install-tools.mjs into server/.tools (hosts
 * without LibreOffice or Chrome, like Render's Node runtime). Same relative
 * location from src/lib and dist/lib.
 */
const PATHS = fileURLToPath(new URL("../../.tools/paths.json", import.meta.url));

function installed(): { soffice?: string; chrome?: string } {
  try {
    return JSON.parse(readFileSync(PATHS, "utf8"));
  } catch {
    return {};
  }
}

// The downloads are Linux builds.
const tools = process.platform === "linux" ? installed() : {};
const usable = (p?: string) => (p && existsSync(p) ? p : undefined);

export const INSTALLED_SOFFICE = usable(tools.soffice);
export const INSTALLED_CHROME = usable(tools.chrome);
