import { useNostr } from "@nostrify/react";
import { useQuery } from "@tanstack/react-query";
import { DITTO_PROFILE_THEME } from "@/lib/const";
import { parseDittoThemeEvent, type DittoTheme } from "@/lib/ditto-theme";

/** Fetch a user's active Ditto profile theme (kind:16767). */
export function useDittoProfile(pubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery<DittoTheme | null>({
    queryKey: ["nostr", "ditto-profile", pubkey ?? ""],
    queryFn: async () => {
      if (!pubkey) return null;

      const events = await nostr.query(
        [{ kinds: [DITTO_PROFILE_THEME], authors: [pubkey], limit: 1 }],
        { signal: AbortSignal.timeout(5000) },
      );

      if (events.length === 0) return null;
      return parseDittoThemeEvent(events[0]);
    },
    enabled: !!pubkey,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
