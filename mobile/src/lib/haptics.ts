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

/** A tap or a change of choice: the lightest tick. */
export const tick = () => void (android ? system(Haptics.AndroidHaptics.Segment_Tick, Haptics.AndroidHaptics.Clock_Tick) : quiet(Haptics.selectionAsync()));

/** A main action, like the + button: a little firmer than a tick, still soft. */
export const press = () => void (android ? system(Haptics.AndroidHaptics.Virtual_Key, Haptics.AndroidHaptics.Virtual_Key) : quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)));

/** Something finished well. */
export const success = () => void (android ? system(Haptics.AndroidHaptics.Confirm, Haptics.AndroidHaptics.Context_Click) : quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)));

/** Something went wrong. */
export const failure = () => void (android ? system(Haptics.AndroidHaptics.Reject, Haptics.AndroidHaptics.Context_Click) : quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)));
