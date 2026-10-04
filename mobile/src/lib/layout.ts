import { useWindowDimensions } from "react-native";

/** Widest the content gets on tablets, so cards and lines stay readable. */
export const MAX_CONTENT = 820;

/** Grid columns for cards: 2 on phones, 3 on small tablets, 4 on large ones. */
export function useColumns() {
  const { width } = useWindowDimensions();
  const content = Math.min(width, MAX_CONTENT) - 32;
  const columns = content >= 700 ? 4 : content >= 520 ? 3 : 2;
  const gap = 10;
  return { columns, gap, cardWidth: (content - gap * (columns - 1)) / columns };
}
