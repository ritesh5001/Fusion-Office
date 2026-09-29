/** Join class names, skipping empty ones. Plain module, so server and client components can both use it. */
export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
