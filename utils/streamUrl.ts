/** Normalize database stream links so bare hostnames never become local routes. */
export function normalizeStreamUrl(value?: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const candidate = trimmed.startsWith('//') ? `https:${trimmed}`
    : /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    if (!url.hostname.includes('.')) return null;
    return url.href;
  } catch {
    return null;
  }
}
