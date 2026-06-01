export function humanizeSlug(slug: string): string {
  return slug
    .replace(/-[0-9a-f]{6,}$/i, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function sourceHue(sourceId: string): number {
  let h = 0;
  for (let i = 0; i < sourceId.length; i++) {
    h = (h * 31 + sourceId.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}
