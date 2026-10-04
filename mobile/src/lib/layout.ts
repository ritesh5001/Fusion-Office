import { useWindowDimensions } from "react-native";

/** Widest the content gets on tablets, so cards and lines stay readable. */
export const MAX_CONTENT = 820;

/** Grid columns for tool cards: 3 on phones, 4 on tablets. */
export function useColumns() {
  const { width } = useWindowDimensions();
  const content = Math.min(width, MAX_CONTENT) - 32;
  const columns = content >= 520 ? 4 : 3;
  const gap = 8;
  return { columns, gap, cardWidth: (content - gap * (columns - 1)) / columns };
}
