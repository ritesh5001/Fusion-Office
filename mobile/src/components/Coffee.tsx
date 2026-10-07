import { useState } from "react";
import { Linking, Pressable, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ChevronRight, Coffee as CoffeeIcon, HandHeart } from "lucide-react-native";
import { C } from "@/theme";
import { enterFade, enterRise } from "@/lib/ease";
import { useReduced } from "@/lib/motion";
import { WEB_URL } from "@/lib/tools";
import { Sheet } from "./Sheet";
import { PressScale, T, TEXT_SCALE } from "./ui";

/**
 * "Buy us a coffee", with a twist: no money changes hands. People choose what
 * a coffee is worth to them, and when they press Pay we thank them and ask
 * them to spend that amount helping someone else instead. Same as the website.
 */

const PRESETS = [49, 99, 199];
const MIN = 10;
const MAX = 100_000;
const COFFEE = "#ffdd6b";
const ON_COFFEE = "#3b2400";

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** The Settings row that opens the coffee sheet. */
export function CoffeeCard() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PressScale onPress={() => setOpen(true)} accessibilityLabel="Buy us a coffee">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: "rgba(255,221,107,0.28)", padding: 14 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,221,107,0.12)", alignItems: "center", justifyContent: "center" }}>
            <CoffeeIcon size={20} color={COFFEE} />
          </View>
          <View style={{ flex: 1 }}>
            <T weight="semibold" style={{ fontSize: 15 }}>Buy us a coffee</T>
            <T style={{ marginTop: 2, fontSize: 12.5, color: C.fgMuted }}>Fusion Office is free. Choose what a coffee is worth to you.</T>
          </View>
          <ChevronRight size={18} color={C.fgSubtle} />
        </View>
      </PressScale>
      <CoffeeSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function CoffeeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduced = useReduced();
  const [preset, setPreset] = useState<number | "custom">(49);
  const [custom, setCustom] = useState("");
  const [thanked, setThanked] = useState<number | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  // Each time the sheet opens it starts at the amount, not the thank-you.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setThanked(null);
  }

  const amount = preset === "custom" ? Number(custom) : preset;
  const ok = Number.isInteger(amount) && amount >= MIN && amount <= MAX;

  const pay = () => {
    if (!ok) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setThanked(amount);
  };

  return (
    <Sheet open={open} onClose={onClose}>
      {thanked !== null ? (
        <Animated.View key="thanks" entering={reduced ? undefined : enterFade()} accessibilityLiveRegion="polite" style={{ alignItems: "center", paddingTop: 6, paddingBottom: 4 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,221,107,0.14)", borderWidth: 1, borderColor: "rgba(255,221,107,0.35)", alignItems: "center", justifyContent: "center" }}>
            <HandHeart size={28} color={COFFEE} />
          </View>
          <Animated.View entering={reduced ? undefined : enterRise(80)} style={{ alignItems: "center" }}>
            <T weight="display" header style={{ marginTop: 16, fontSize: 22, letterSpacing: -0.5, textAlign: "center" }}>
              Thank you. That means a lot.
            </T>
            <T style={{ marginTop: 10, fontSize: 15, lineHeight: 22, color: C.fgMuted, textAlign: "center" }}>
              Please keep your <T weight="semibold" style={{ fontSize: 15, color: C.fg }}>{rupees(thanked)}</T>. Fusion Office is free, and it will stay that way.
            </T>
            <T style={{ marginTop: 10, fontSize: 15, lineHeight: 22, color: C.fgMuted, textAlign: "center" }}>
              Instead, we’d ask you to spend it on someone who could use a little help today: a meal, a cup of tea, or a book for a student. That is the best coffee you could buy us.
            </T>
          </Animated.View>
          <Animated.View entering={reduced ? undefined : enterRise(160)} style={{ alignSelf: "stretch", marginTop: 22, gap: 6 }}>
            <PressScale onPress={onClose} style={{ minHeight: 54, borderRadius: 27, backgroundColor: COFFEE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <HandHeart size={19} color={ON_COFFEE} />
              <T weight="bold" style={{ fontSize: 16, color: ON_COFFEE }}>I’ll pay it forward</T>
            </PressScale>
            <PressScale accessibilityRole="link" onPress={() => Linking.openURL(`${WEB_URL}/pay-it-forward#share`)} haptic={false} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
              <T weight="semibold" style={{ fontSize: 14, color: C.brand300 }}>Tell us who you helped</T>
            </PressScale>
          </Animated.View>
        </Animated.View>
      ) : (
        <Animated.View key="form" entering={reduced ? undefined : enterFade()} style={{ paddingTop: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,221,107,0.12)", alignItems: "center", justifyContent: "center" }}>
              <CoffeeIcon size={24} color={COFFEE} />
            </View>
            <View style={{ flex: 1 }}>
              <T weight="display" header style={{ fontSize: 21, letterSpacing: -0.5 }}>Buy us a coffee</T>
              <T style={{ marginTop: 2, fontSize: 13, color: C.fgMuted }}>Choose what a coffee is worth to you.</T>
            </View>
          </View>

          <T weight="medium" style={{ marginTop: 20, marginBottom: 8, fontSize: 12.5, color: C.fgMuted }}>Choose an amount</T>
          <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 8 }}>
            {[...PRESETS, "custom" as const].map((p) => {
              const on = preset === p;
              return (
                <Pressable
                  key={p}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setPreset(p);
                  }}
                  style={({ pressed }) => ({ flex: 1, height: 54, borderRadius: 14, borderWidth: 1, borderColor: on ? COFFEE : C.lineStrong, backgroundColor: on ? COFFEE : C.sunken, alignItems: "center", justifyContent: "center", opacity: pressed && !on ? 0.75 : 1 })}
                >
                  <T weight="semibold" maxFontSizeMultiplier={TEXT_SCALE.label} style={{ fontSize: 15, color: on ? ON_COFFEE : C.fg }}>
                    {p === "custom" ? "Other" : rupees(p)}
                  </T>
                </Pressable>
              );
            })}
          </View>

          {preset === "custom" && (
            <Animated.View entering={reduced ? undefined : enterFade()} style={{ marginTop: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", height: 50, borderRadius: 14, borderWidth: 1, borderColor: COFFEE, backgroundColor: C.sunken, paddingHorizontal: 14 }}>
                <T weight="semibold" style={{ fontSize: 17, color: C.fgMuted }}>₹</T>
                <TextInput
                  autoFocus
                  value={custom}
                  onChangeText={(v) => setCustom(v.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={pay}
                  placeholder={`Any amount from ${MIN}`}
                  placeholderTextColor={C.fgSubtle}
                  accessibilityLabel="Your amount in rupees"
                  maxFontSizeMultiplier={1.4}
                  style={{ flex: 1, height: "100%", marginLeft: 6, color: C.fg, fontSize: 17, fontFamily: "Inter_600SemiBold" }}
                />
              </View>
              {!!custom && !ok && <T style={{ marginTop: 6, fontSize: 12.5, color: C.danger }}>Enter between {rupees(MIN)} and {rupees(MAX)}.</T>}
            </Animated.View>
          )}

          <PressScale disabled={!ok} onPress={pay} style={{ marginTop: 18, minHeight: 54, borderRadius: 27, backgroundColor: ok ? COFFEE : C.raised, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <CoffeeIcon size={19} color={ok ? ON_COFFEE : C.fgSubtle} />
            <T weight="bold" style={{ fontSize: 16, color: ok ? ON_COFFEE : C.fgSubtle }}>{ok ? `Pay ${rupees(amount)}` : "Choose an amount"}</T>
          </PressScale>
        </Animated.View>
      )}
    </Sheet>
  );
}
