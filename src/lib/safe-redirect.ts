/** Only allow same-origin relative paths (blocks "//evil.com" and absolute URLs). */
export function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return undefined;
  return value.slice(0, 200);
}
