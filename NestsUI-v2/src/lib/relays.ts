/**
 * Normalize a relay URL.
 *
 * Returns the normalized URL string, or `null` if the input is malformed.
 *
 * Normalization rules:
 *  - Must parse as a valid URL with `ws:` or `wss:` protocol
 *  - Hostname is lowercased
 *  - Trailing slash on a root path is stripped (so `wss://relay/` === `wss://relay`)
 *  - Default ports (80 for ws, 443 for wss) are dropped
 *  - Hash and search components are dropped
 */
export function normalizeRelayUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "ws:" && url.protocol !== "wss:") return null;
  if (!url.hostname) return null;

  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  url.search = "";

  // Drop default ports
  if (
    (url.protocol === "wss:" && url.port === "443") ||
    (url.protocol === "ws:" && url.port === "80")
  ) {
    url.port = "";
  }

  let out = url.toString();
  // Strip the single trailing slash that `new URL` adds when the path is "/"
  if (out.endsWith("/") && url.pathname === "/") {
    out = out.slice(0, -1);
  }
  return out;
}

/**
 * Build a deduplicated list of normalized relay URLs from one or more inputs.
 * Invalid entries are silently dropped.
 */
export function dedupeRelays(...lists: Array<Iterable<unknown> | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    if (!list) continue;
    for (const entry of list) {
      const norm = normalizeRelayUrl(entry);
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      out.push(norm);
    }
  }
  return out;
}
