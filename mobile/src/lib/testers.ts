import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/lib/tools";

/**
 * Early testers thanked on the Special thanks screen. They sign up on the
 * website with an invite link; the server keeps a small square photo of each.
 * The list is cached on the device so the screen opens instantly (and works
 * offline), then refreshes from the server.
 */
export interface Tester {
  id: string;
  name: string;
  username: string;
  /** Absolute URL of the photo (a 400 × 400 JPEG). */
  photo: string;
  joinedAt: string;
}

const CACHE_KEY = "fo-testers-v1";
// The server sleeps when idle and can take most of a minute to wake up.
const TIMEOUT_MS = 60_000;

async function fetchTesters(): Promise<Tester[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/api/testers`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Server answered ${res.status}`);
    const data = (await res.json()) as { testers?: Tester[] };
    return (data.testers ?? []).map((t) => ({ ...t, photo: t.photo.startsWith("http") ? t.photo : `${API_URL}${t.photo}` }));
  } finally {
    clearTimeout(timer);
  }
}

async function readCache(): Promise<Tester[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Tester[]) : null;
  } catch {
    return null;
  }
}

/** The tester list: cached copy first, then the server's. `error` is set only when there's nothing to show. */
export function useTesters() {
  const [state, setState] = useState<{ testers: Tester[] | null; loading: boolean; error: boolean }>({ testers: null, loading: true, error: false });
  // Bumped by refresh() to load again.
  const [round, setRound] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const cached = await readCache();
      if (alive && cached) setState((cur) => (cur.testers ? cur : { ...cur, testers: cached }));
      try {
        const fresh = await fetchTesters();
        if (!alive) return;
        setState({ testers: fresh, loading: false, error: false });
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh)).catch(() => {});
      } catch {
        // Keep whatever is on screen; only an empty screen counts as an error.
        if (alive) setState((cur) => ({ ...cur, loading: false, error: !cur.testers }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [round]);

  /** Pull to refresh / Try again. */
  const refresh = useCallback(() => {
    setState((cur) => ({ ...cur, loading: true }));
    setRound((n) => n + 1);
  }, []);

  return { ...state, refresh };
}
