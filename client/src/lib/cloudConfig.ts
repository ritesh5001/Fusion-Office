"use client";

import { useEffect, useState } from "react";

export interface CloudUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface CloudConfig {
  authEnabled: boolean;
  cloudEnabled: boolean;
  user: CloudUser | null;
}

const OFFLINE: CloudConfig = { authEnabled: false, cloudEnabled: false, user: null };
let pending: Promise<CloudConfig> | null = null;

/**
 * Ask the backend which cloud features are available. If the server isn't
 * running, everything falls back to "off" — the editor itself never needs it.
 */
export function fetchCloudConfig(): Promise<CloudConfig> {
  if (!pending) {
    pending = fetch("/api/config", { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<CloudConfig>) : OFFLINE))
      .catch(() => OFFLINE);
  }
  return pending;
}

export function useCloudConfig(): CloudConfig & { loading: boolean } {
  const [state, setState] = useState<CloudConfig & { loading: boolean }>({ ...OFFLINE, loading: true });
  useEffect(() => {
    let alive = true;
    fetchCloudConfig().then((c) => alive && setState({ ...c, loading: false }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

/** Auth.js pages served by the backend (through the /api proxy). */
export const signInUrl = (callbackUrl: string) => `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
export const signOutUrl = () => `/api/auth/signout`;
