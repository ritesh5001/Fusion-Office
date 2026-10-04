import { useNetworkState } from "expo-network";

/**
 * True only when the device reports no connection. Unknown (still checking)
 * counts as online, so nothing flashes an offline warning on launch.
 */
export function useOffline() {
  const n = useNetworkState();
  return n.isConnected === false || n.isInternetReachable === false;
}
