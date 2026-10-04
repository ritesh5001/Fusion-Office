import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useLocalSearchParams } from "expo-router";
import { Search, X } from "lucide-react-native";
import { C } from "@/theme";
import { useReduced } from "@/lib/motion";
import { useSession } from "@/lib/session";
import { useRecents } from "@/lib/recents";
import { CATEGORIES, CATEGORY_META, TOOLS, accepts, searchTools, toolBySlug, type Category, type ToolDef } from "@/lib/tools";
import { Screen } from "@/components/Screen";
import { ToolCard } from "@/components/ToolCard";
import { ToolPreview } from "@/components/ToolPreview";
import { openTool } from "@/components/DropStage";
import { PressScale, T } from "@/components/ui";

type Cat = Category | "all";

/** Every tool: search first (mobile-first navigation), category chips, then grouped grids. */
export default function Tools() {
  const params = useLocalSearchParams<{ focus?: string; fit?: string }>();
  const reduced = useReduced();
  const { staged } = useSession();
  const recents = useRecents();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Cat>("all");
  const [preview, setPreview] = useState<ToolDef | null>(null);
  const input = useRef<TextInput>(null);
  const fitMode = params.fit === "1" && !!staged?.length;

  useEffect(() => {
    if (params.focus === "1") setTimeout(() => input.current?.focus(), 350);
  }, [params.focus]);

  const pool = useMemo(
    () => (fitMode ? TOOLS.filter((t) => t.status === "ready" && (staged!.length === 1 || t.multiple) && staged!.every((f) => accepts(t, f.name, f.mimeType))) : TOOLS),
    [fitMode, staged],
  );
  const results = useMemo(() => searchTools(pool.filter((t) => cat === "all" || t.category === cat), query), [pool, cat, query]);
  const recentTools = useMemo(() => [...new Set((recents ?? []).map((r) => r.tool))].map(toolBySlug).filter((t): t is ToolDef => !!t).slice(0, 4), [recents]);

  const grid = (tools: ToolDef[]) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10, marginTop: 10 }}>
      {tools.map((t, i) => (
        <ToolCard key={t.slug} tool={t} index={i} onPress={() => openTool(t.slug, fitMode)} onLongPress={() => setPreview(t)} />
      ))}
    </View>
  );

  const grouped = cat === "all" && !query.trim();

  return (
    <Screen>
      <T weight="display" style={{ marginTop: 8, fontSize: 28, letterSpacing: -0.9 }}>{fitMode ? "Tools for your file" : "What do you want to do?"}</T>
      <T style={{ marginTop: 4, fontSize: 13.5, color: C.fgMuted }}>
        {fitMode ? `${pool.length} tools can open ${staged!.length === 1 ? staged![0].name : `${staged!.length} files`}.` : `${TOOLS.length} tools for PDFs, Office files and images.`}
      </T>

      <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", height: 52, borderRadius: 16, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.surface, paddingHorizontal: 14, gap: 10 }}>
        <Search size={19} color={C.fgSubtle} />
        <TextInput
          ref={input}
          value={query}
          onChangeText={setQuery}
          placeholder="Compress a PDF, merge, photo to PDF…"
          placeholderTextColor={C.fgSubtle}
          returnKeyType="search"
          autoCorrect={false}
          onSubmitEditing={() => results[0] && openTool(results[0].slug, fitMode)}
          style={{ flex: 1, height: "100%", color: C.fg, fontSize: 16 }}
          accessibilityLabel="Search tools"
        />
        {query ? (
          <PressScale onPress={() => setQuery("")} accessibilityLabel="Clear search" style={{ padding: 4 }}>
            <X size={18} color={C.fgMuted} />
          </PressScale>
        ) : null}
      </View>

      <Chips value={cat} onChange={setCat} counts={(c) => (c === "all" ? pool.length : pool.filter((t) => t.category === c).length)} />

      {results.length === 0 ? (
        <View style={{ marginTop: 30, alignItems: "center" }}>
          <T weight="semibold" style={{ fontSize: 16 }}>No tool matches “{query}”</T>
          <T style={{ marginTop: 6, color: C.fgMuted }}>Try a simpler word, like “pdf”, “image” or “convert”.</T>
        </View>
      ) : grouped ? (
        <>
          {!fitMode && recentTools.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <T weight="semibold" style={{ fontSize: 16 }}>Recently used</T>
              {grid(recentTools)}
            </View>
          )}
          {CATEGORIES.map((c) => {
            const inCat = results.filter((t) => t.category === c.id);
            if (!inCat.length) return null;
            return (
              <Animated.View key={c.id} entering={reduced ? undefined : FadeInDown.duration(420)} style={{ marginTop: 26 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CATEGORY_META[c.id].color }} />
                  <T weight="semibold" style={{ fontSize: 16, flex: 1 }}>{CATEGORY_META[c.id].title}</T>
                  <T style={{ fontSize: 13, color: C.fgSubtle }}>{inCat.length}</T>
                </View>
                {grid(inCat)}
              </Animated.View>
            );
          })}
        </>
      ) : (
        <View style={{ marginTop: 16 }}>{grid(results)}</View>
      )}

      <ToolPreview tool={preview} onClose={() => setPreview(null)} />
    </Screen>
  );
}

/** Horizontal category chips; the active pill slides between them (250ms). */
function Chips({ value, onChange, counts }: { value: Cat; onChange: (c: Cat) => void; counts: (c: Cat) => number }) {
  const items: { id: Cat; label: string }[] = [{ id: "all", label: "All" }, ...CATEGORIES.map((c) => ({ id: c.id as Cat, label: CATEGORY_META[c.id].short }))];
  const [layouts, setLayouts] = useState<Record<string, { x: number; w: number }>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    const l = layouts[value];
    if (!l) return;
    const ease = { duration: 250, easing: Easing.bezier(0.3, 0.7, 0.2, 1) };
    x.value = withTiming(l.x, ease);
    w.value = withTiming(l.w, ease);
    scroll.current?.scrollTo({ x: Math.max(0, l.x - 40), animated: true });
  }, [value, layouts, x, w]);
  const pill = useAnimatedStyle(() => ({ width: w.value, transform: [{ translateX: x.value }] }));

  return (
    <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
      <Animated.View style={[{ position: "absolute", left: 0, top: 0, height: 38, borderRadius: 19, backgroundColor: C.fg }, pill]} />
      {items.map((c) => {
        const n = counts(c.id);
        if (!n && c.id !== "all") return null;
        const on = value === c.id;
        return (
          <View key={c.id} onLayout={(e) => {
            const { x: lx, width } = e.nativeEvent.layout;
            setLayouts((cur) => (cur[c.id]?.x === lx && cur[c.id]?.w === width ? cur : { ...cur, [c.id]: { x: lx, w: width } }));
          }}>
          <PressScale
            onPress={() => onChange(c.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{ height: 38, paddingHorizontal: 14, borderRadius: 19, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: on ? 0 : 1, borderColor: C.line }}
          >
            <T weight="medium" style={{ fontSize: 13.5, color: on ? C.app : C.fgMuted }}>{c.label}</T>
            <T style={{ fontSize: 12, color: on ? "rgba(10,12,17,0.55)" : C.fgSubtle }}>{n}</T>
          </PressScale>
          </View>
        );
      })}
    </ScrollView>
  );
}
