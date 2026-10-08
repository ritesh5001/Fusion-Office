import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Haptics, kept light. On Android, expo-haptics' selection/impact/notification
 * calls drive the vibration motor with fixed patterns (a 50 ms buzz for a
 * selection), which feels heavy on most phones. The system haptic constants are
 * tuned per device, short and crisp, and follow the phone's own touch-feedback
 * setting, so Android uses those. iOS keeps its Taptic Engine, at the soft end.
 */

const android = Platform.OS === "android";
const quiet = (p: Promise<void>) => p.catch(() => {});

/** Newer constants (Android 11 / 14) fall back to ones every Android version has. */
const system = (type: Haptics.AndroidHaptics, fallback: Haptics.AndroidHaptics) =>
  Haptics.performAndroidHapticsAsync(type).catch(() => quiet(Haptics.performAndroidHapticsAsync(fallback)));

/** A tap or a change of choice: a light, crisp tick (one step above the faintest). */
export const tick = () => void (android ? system(Haptics.AndroidHaptics.Context_Click, Haptics.AndroidHaptics.Context_Click) : quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)));

/** A main action, like the + button: a little firmer than a tick. */
export const press = () => void (android ? system(Haptics.AndroidHaptics.Virtual_Key, Haptics.AndroidHaptics.Virtual_Key) : quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)));

/** Something finished well. */
export const success = () => void (android ? system(Haptics.AndroidHaptics.Confirm, Haptics.AndroidHaptics.Long_Press) : quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)));

/** Something went wrong. */
export const failure = () => void (android ? system(Haptics.AndroidHaptics.Reject, Haptics.AndroidHaptics.Context_Click) : quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)));
