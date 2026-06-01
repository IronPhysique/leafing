export function coverVtName(key: string): string {
  return "cover-" + key.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 80);
}
