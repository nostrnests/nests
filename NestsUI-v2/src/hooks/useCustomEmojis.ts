import { useNostr } from "@nostrify/react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { NostrEvent } from "@nostrify/nostrify";

export interface CustomEmoji {
  shortcode: string;
  url: string;
}

/**
 * Fetch the current user's custom emoji list (kind:10030) and
 * resolve any referenced emoji sets (kind:30030).
 */
export function useCustomEmojis() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ["nostr", "custom-emojis", user?.pubkey ?? ""],
    queryFn: async (): Promise<CustomEmoji[]> => {
      if (!user) return [];

      // Small delay to let relay connections warm up — the pool's 200ms eoseTimeout
      // can cause missed results if connections aren't established yet
      await new Promise((r) => setTimeout(r, 500));

      // Fetch the user's emoji list (kind:10030)
      const emojiListEvents = await nostr.query(
        [{ kinds: [10030], authors: [user.pubkey], limit: 1 }],
        { signal: AbortSignal.timeout(5000) },
      );

      if (emojiListEvents.length === 0) return [];

      const emojiList = emojiListEvents[0];
      const emojis: CustomEmoji[] = [];
      const emojiSetRefs: Array<{ kind: number; pubkey: string; identifier: string }> = [];

      for (const tag of emojiList.tags) {
        if (tag[0] === "emoji" && tag[1] && tag[2]) {
          // Direct emoji tag
          emojis.push({ shortcode: tag[1], url: tag[2] });
        } else if (tag[0] === "a" && tag[1]) {
          // Reference to emoji set (kind:30030)
          const parts = tag[1].split(":");
          if (parts.length === 3 && parseInt(parts[0]) === 30030) {
            emojiSetRefs.push({
              kind: 30030,
              pubkey: parts[1],
              identifier: parts[2],
            });
          }
        }
      }

      // Fetch referenced emoji sets
      if (emojiSetRefs.length > 0) {
        const setFilters = emojiSetRefs.map((ref) => ({
          kinds: [30030 as number],
          authors: [ref.pubkey],
          "#d": [ref.identifier],
          limit: 1,
        }));

        const setEvents = await nostr.query(setFilters, {
          signal: AbortSignal.timeout(5000),
        });

        for (const ev of setEvents) {
          for (const tag of ev.tags) {
            if (tag[0] === "emoji" && tag[1] && tag[2]) {
              emojis.push({ shortcode: tag[1], url: tag[2] });
            }
          }
        }
      }

      // Deduplicate by shortcode
      const seen = new Set<string>();
      return emojis.filter((e) => {
        if (seen.has(e.shortcode)) return false;
        seen.add(e.shortcode);
        return true;
      });
    },
    enabled: !!user,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 30_000, // Refetch after 30s if stale (relay connections may be warmer)
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}
