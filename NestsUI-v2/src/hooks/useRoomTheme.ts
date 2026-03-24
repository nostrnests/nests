import { useMemo } from "react";
import { useNostr } from "@nostrify/react";
import { useQuery } from "@tanstack/react-query";
import type { NostrEvent } from "@nostrify/nostrify";
import { DITTO_THEME } from "@/lib/const";
import { parseDittoThemeEvent, parseThemeTags, type DittoTheme } from "@/lib/ditto-theme";

/**
 * Resolve the room's active theme.
 * Checks for an `a` tag referencing a kind:36767 theme, then falls back to inline `c` tags.
 */
export function useRoomTheme(roomEvent: NostrEvent) {
  const { nostr } = useNostr();

  // Check for a theme reference tag: ["a", "36767:<pubkey>:<d-tag>"]
  const themeRef = roomEvent.tags.find(
    ([t, v]) => t === "a" && v?.startsWith(`${DITTO_THEME}:`),
  )?.[1];

  // Parse the reference
  const refParts = themeRef?.split(":");
  const refPubkey = refParts?.[1];
  const refDTag = refParts?.[2];

  // Parse inline theme synchronously (no fetch needed)
  const inlineTheme = useMemo(
    () => parseThemeTags(roomEvent.tags),
    [roomEvent.tags],
  );

  // Only fetch from network if there's a theme reference to resolve
  const { data: fetchedTheme } = useQuery<DittoTheme | null>({
    queryKey: ["nostr", "room-theme-ref", themeRef ?? ""],
    queryFn: async () => {
      if (!refPubkey || !refDTag) return null;

      const events = await nostr.query(
        [{
          kinds: [DITTO_THEME],
          authors: [refPubkey],
          "#d": [refDTag],
          limit: 1,
        }],
        { signal: AbortSignal.timeout(5000) },
      );

      if (events.length > 0) {
        return parseDittoThemeEvent(events[0]);
      }
      return null;
    },
    enabled: !!themeRef,
    staleTime: Infinity, // Never refetch — theme doesn't change during a session
    gcTime: Infinity,
    retry: 2,
  });

  // Prefer fetched theme (from a-tag reference), fall back to inline
  return { data: fetchedTheme ?? inlineTheme };
}
