import { useNostr } from "@nostrify/react";
import { useQuery } from "@tanstack/react-query";
import type { NostrEvent, NostrFilter } from "@nostrify/nostrify";
import { DITTO_THEME, DITTO_PROFILE_THEME } from "@/lib/const";
import { parseDittoThemeEvent, type DittoTheme } from "@/lib/ditto-theme";

export interface DittoThemeEntry {
  event: NostrEvent;
  theme: DittoTheme;
}

/** Fetch a specific user's published Ditto themes (kind:36767). */
export function useDittoThemes(pubkey?: string) {
  const { nostr } = useNostr();

  return useQuery<DittoThemeEntry[]>({
    queryKey: ["nostr", "ditto-themes", pubkey ?? "none"],
    queryFn: async () => {
      if (!pubkey) return [];

      const events = await nostr.query(
        [{ kinds: [DITTO_THEME], authors: [pubkey], limit: 50 }],
        { signal: AbortSignal.timeout(5000) },
      );

      return parseThemeEvents(events);
    },
    enabled: !!pubkey,
    staleTime: 60_000,
    retry: 2,
  });
}

/** Fetch theme feed — either global or from a list of pubkeys. */
export function useThemeFeed(authors?: string[]) {
  const { nostr } = useNostr();

  return useQuery<DittoThemeEntry[]>({
    queryKey: ["nostr", "theme-feed", authors ? authors.slice(0, 5).join(",") : "global"],
    queryFn: async () => {
      const filter: NostrFilter = {
        kinds: [DITTO_THEME, DITTO_PROFILE_THEME],
        limit: 50,
      };
      if (authors && authors.length > 0) {
        filter.authors = authors;
      }

      const events = await nostr.query([filter], { signal: AbortSignal.timeout(5000) });
      return parseThemeEvents(events);
    },
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}

function parseThemeEvents(events: NostrEvent[]): DittoThemeEntry[] {
  const entries: DittoThemeEntry[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);

    const theme = parseDittoThemeEvent(event);
    if (theme) {
      entries.push({ event, theme });
    }
  }

  return entries.sort((a, b) => b.event.created_at - a.event.created_at);
}
