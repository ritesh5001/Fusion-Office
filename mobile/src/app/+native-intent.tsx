/**
 * "Open with Fusion Office" from another app arrives as a content:// (or
 * file://) address. It isn't a screen, so the router shouldn't try to open
 * it: IncomingFiles (in the root layout) reads the file and shows /open.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  try {
    if (/^(content|file):\/\//i.test(path)) return initial ? "/" : null;
  } catch {
    /* fall through */
  }
  return path;
}
