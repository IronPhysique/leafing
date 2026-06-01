export function proxiedImage(
  url: string,
  referer?: string,
  descramble?: unknown,
): string {
  const qs = new URLSearchParams({ src: url });
  if (referer) qs.set("ref", referer);
  if (descramble != null) qs.set("ds", JSON.stringify(descramble));
  return `/api/img?${qs.toString()}`;
}
