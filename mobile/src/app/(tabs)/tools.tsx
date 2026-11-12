import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { FlatList, ScrollView, TextInput, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useLocalSearchParams } from "expo-router";
import { Search, X } from "lucide-react-native";
import { C } from "@/theme";
import { useReduced } from "@/lib/motion";
import { useSession } from "@/lib/session";
import { useRecents } from "@/lib/recents";
import { CATEGORIES, CATEGORY_META, TOOLS, TOOL_COUNT, accepts, searchTools, toolBySlug, type Category, type ToolDef } from "@/lib/tools";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_SPACE } from "@/components/TabBar";
import { MAX_CONTENT, useColumns } from "@/lib/layout";
import { ToolCard } from "@/components/ToolCard";
import { ToolPreview } from "@/components/ToolPreview";
import { openTool } from "@/components/DropStage";
import { Backdrop, PressScale, T, TEXT_SCALE } from "@/components/ui";

type Cat = Category | "all";

/** Every tool: search first (mobile-first navigation), category chips, then grouped grids. */
export default function Tools() {
  const params = useLocalSearchParams<{ focus?: string; fit?: string }>();
  const reduced = useReduced();
  const insets = useSafeAreaInsets();
  const { staged } = useSession();
  const recents = useRecents();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Cat>("all");
  const [preview, setPreview] = useState<ToolDef | null>(null);
  const input = useRef<TextInput>(null);
  // The search box keeps its own text (typing never waits for the grid); results
  // follow a moment after you pause, as a low-priority update.
  const search = useDeferredValue(query);
  const searching = !!search.trim();
  const fitMode = params.fit === "1" && !!staged?.length;

  useEffect(() => {
    if (params.focus === "1") setTimeout(() => input.current?.focus(), 350);
  }, [params.focus]);

  const pool = useMemo(
    () => (fitMode ? TOOLS.filter((t) => t.status === "ready" && (staged!.length === 1 || t.multiple) && staged!.every((f) => accepts(t, f.name, f.mimeType))) : TOOLS),
    [fitMode, staged],
  );
  const results = useMemo(() => (searching ? searchTools(pool.filter((t) => cat === "all" || t.category === cat), search) : []), [pool, cat, search, searching]);
  const recentTools = useMemo(() => [...new Set((recents ?? []).map((r) => r.tool))].map(toolBySlug).filter((t): t is ToolDef => !!t).slice(0, 4), [recents]);

  const { columns, gap, cardWidth } = useColumns();

  // Two lists: the full catalogue (built once, kept alive) and search results.
  // Clearing a search just shows the catalogue again, with nothing to rebuild,
  // so search → delete → search never stalls.
  const browseRows = useMemo(() => {
    const out: Row[] = [];
    const add = (key: string, tools: ToolDef[]) => {
      for (let i = 0; i < tools.length; i += columns) out.push({ kind: "cards", key: `${key}-${i}`, tools: tools.slice(i, i + columns), start: i });
    };
    const inCat = pool.filter((t) => cat === "all" || t.category === cat);
    if (cat !== "all") {
      add(`cat-${cat}`, inCat);
      return out;
    }
    if (!fitMode && recentTools.length) {
      out.push({ kind: "title", key: "t-recent", title: "Recently used" });
      add("recent", recentTools);
    }
    for (const c of CATEGORIES) {
      const tools = inCat.filter((t) => t.category === c.id);
      if (!tools.length) continue;
      out.push({ kind: "title", key: `t-${c.id}`, title: CATEGORY_META[c.id].title, color: CATEGORY_META[c.id].color, count: tools.length });
      add(c.id, tools);
    }
    return out;
  }, [pool, cat, fitMode, recentTools, columns]);

  const resultRows = useMemo(() => {
    const out: Row[] = [];
    if (!searching) return out;
    for (let i = 0; i < results.length; i += columns) out.push({ kind: "cards", key: `r-${results.slice(i, i + columns).map((t) => t.slug).join(",")}`, tools: results.slice(i, i + columns), start: i });
    return out;
  }, [results, searching, columns]);

  // Each new search starts at the top of its results.
  const resultsRef = useRef<FlatList<Row>>(null);
  useEffect(() => {
    resultsRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [search, cat]);

  // Cards rise in when you first open the screen, not every time a list reappears.
  const [intro, setIntro] = useState(!reduced);
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 1200);
    return () => clearTimeout(t);
  }, []);

  // Stable callbacks, so rows whose tools didn't change aren't redrawn.
  const latest = useRef({ pool, cat, fitMode });
  useEffect(() => {
    latest.current = { pool, cat, fitMode };
  }, [pool, cat, fitMode]);
  const submit = useCallback((text: string) => {
    const { pool, cat, fitMode } = latest.current;
    const first = searchTools(pool.filter((t) => cat === "all" || t.category === cat), text)[0];
    if (first) openTool(first.slug, fitMode);
  }, []);
  const open = useCallback((slug: string) => openTool(slug, latest.current.fitMode), []);

  const renderRow = useCallback(
    ({ item }: { item: Row }, animate: boolean) =>
      item.kind === "title" ? (
        <Animated.View entering={animate ? FadeInDown.duration(380) : undefined} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 22, marginBottom: 10 }}>
          {item.color && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />}
          <T weight="semibold" header style={{ fontSize: 16, flex: 1 }}>{item.title}</T>
          {item.count != null && <T style={{ fontSize: 13, color: C.fgSubtle }}>{item.count}</T>}
        </Animated.View>
      ) : (
        <CardRow tools={item.tools} start={item.start} gap={gap} width={cardWidth} animate={animate} onOpen={open} onPreview={setPreview} />
      ),
    [gap, cardWidth, open],
  );
  const renderBrowse = useCallback((info: { item: Row }) => renderRow(info, intro), [renderRow, intro]);
  const renderResult = useCallback((info: { item: Row }) => renderRow(info, false), [renderRow]);

  const listStyle = { paddingTop: 4, paddingBottom: TAB_BAR_SPACE + insets.bottom + 12, paddingHorizontal: 16, width: "100%" as const, maxWidth: MAX_CONTENT, alignSelf: "center" as const };

  return (
    <View style={{ flex: 1, backgroundColor: C.app }}>
      <Backdrop />
      {/* The search bar stays put while the tools scroll under it. */}
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16, width: "100%", maxWidth: MAX_CONTENT, alignSelf: "center" }}>
        <T weight="display" header style={{ marginTop: 8, fontSize: 26, letterSpacing: -0.8 }}>{fitMode ? "Tools for your file" : "What do you want to do?"}</T>
        <T style={{ marginTop: 2, fontSize: 13.5, color: C.fgMuted }}>
          {fitMode ? `${pool.length} tools can open ${staged!.length === 1 ? staged![0].name : `${staged!.length} files`}.` : `${TOOL_COUNT} tools for PDFs, Office files and images.`}
        </T>
        <SearchBox inputRef={input} onSearch={setQuery} onSubmit={submit} />
        <Chips value={cat} onChange={setCat} counts={(c) => (c === "all" ? pool.length : pool.filter((t) => t.category === c).length)} />
      </View>

      <View style={{ flex: 1, marginTop: 6 }}>
        <FlatList
          data={browseRows}
          keyExtractor={(r) => r.key}
          renderItem={renderBrowse}
          style={searching ? { display: "none" } : undefined}
          contentContainerStyle={listStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={9}
        />
        {searching && (
          <FlatList
            ref={resultsRef}
            data={resultRows}
            keyExtractor={(r) => r.key}
            renderItem={renderResult}
            contentContainerStyle={[listStyle, { paddingTop: 10 }]}
            ListEmptyComponent={
              <View style={{ marginTop: 30, alignItems: "center" }}>
                <T weight="semibold" style={{ fontSize: 16 }}>No tool matches “{search.trim()}”</T>
                <T style={{ marginTop: 6, color: C.fgMuted, textAlign: "center" }}>Try a simpler word, like “pdf”, “image” or “convert”.</T>
              </View>
            }
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            initialNumToRender={5}
            maxToRenderPerBatch={4}
            windowSize={7}
          />
        )}
      </View>
      <ToolPreview tool={preview} onClose={() => setPreview(null)} />
    </View>
  );
}

/**
 * The search field. It owns its text, so a keystroke only redraws this box;
 * the screen hears about it once typing pauses (90 ms), or at once when cleared.
 */
const SearchBox = memo(function SearchBox({ inputRef, onSearch, onSubmit }: { inputRef: RefObject<TextInput | null>; onSearch: (q: string) => void; onSubmit: (q: string) => void }) {
  // Uncontrolled: Android can drop or repeat letters when a controlled input
  // waits on a busy screen. `text` only decides whether the clear button shows.
  const [text, setText] = useState("");
  useEffect(() => {
    const t = setTimeout(() => onSearch(text), text.trim() ? 90 : 0);
    return () => clearTimeout(t);
  }, [text, onSearch]);
  return (
    <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.surface, paddingHorizontal: 14, gap: 10 }}>
      <Search size={19} color={C.fgSubtle} />
      <TextInput
        ref={inputRef}
        defaultValue=""
        onChangeText={setText}
        placeholder="Compress a PDF, merge, photo to PDF…"
        placeholderTextColor={C.fgSubtle}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        onSubmitEditing={() => onSubmit(text)}
        maxFontSizeMultiplier={TEXT_SCALE.label}
        style={{ flex: 1, minHeight: 50, color: C.fg, fontSize: 16 }}
        accessibilityLabel="Search tools"
      />
      {text ? (
        <PressScale onPress={() => (inputRef.current?.clear(), setText(""))} accessibilityLabel="Clear search" hitSlop={14} style={{ padding: 4 }}>
          <X size={18} color={C.fgMuted} />
        </PressScale>
      ) : null}
    </View>
  );
});

/** One row of cards. Redrawn only when its tools or size change, not on every keystroke. */
const CardRow = memo(
  function CardRow({ tools, start, gap, width, animate, onOpen, onPreview }: { tools: ToolDef[]; start: number; gap: number; width: number; animate: boolean; onOpen: (slug: string) => void; onPreview: (t: ToolDef) => void }) {
    return (
      <View style={{ flexDirection: "row", gap, marginBottom: gap }}>
        {tools.map((t, i) => (
          <ToolCard key={t.slug} tool={t} index={start + i} width={width} animate={animate} onPress={() => onOpen(t.slug)} onLongPress={() => onPreview(t)} />
        ))}
      </View>
    );
  },
  (a, b) => a.start === b.start && a.gap === b.gap && a.width === b.width && a.animate === b.animate && a.tools.length === b.tools.length && a.tools.every((t, i) => t === b.tools[i]),
);

type Row = { kind: "title"; key: string; title: string; color?: string; count?: number } | { kind: "cards"; key: string; tools: ToolDef[]; start: number };

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
            accessibilityLabel={`${c.label}, ${n} tools`}
            accessibilityState={{ selected: on }}
            style={{ height: 38, paddingHorizontal: 14, borderRadius: 19, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: on ? 0 : 1, borderColor: C.line }}
          >
            <T weight="medium" maxFontSizeMultiplier={TEXT_SCALE.label} style={{ fontSize: 13.5, color: on ? C.app : C.fgMuted }}>{c.label}</T>
            <T maxFontSizeMultiplier={TEXT_SCALE.label} style={{ fontSize: 12, color: on ? "rgba(10,12,17,0.65)" : C.fgSubtle }}>{n}</T>
          </PressScale>
          </View>
        );
      })}
    </ScrollView>
  );
}
