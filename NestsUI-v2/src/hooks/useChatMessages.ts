import { useNostr } from "@nostrify/react";
import { useQuery } from "@tanstack/react-query";
import { LIVE_CHAT } from "@/lib/const";

/**
 * Query kind:1311 live chat messages for a room.
 */
export function useChatMessages(roomATag: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ["nostr", "chat-messages", roomATag ?? ""],
    queryFn: async () => {
      if (!roomATag) return [];

      const events = await nostr.query(
        [{ kinds: [LIVE_CHAT], "#a": [roomATag], limit: 200 }],
        { signal: AbortSignal.timeout(3000) },
      );

      // Sort oldest first for chat display
      return events.sort((a, b) => a.created_at - b.created_at);
    },
    enabled: !!roomATag,
    refetchInterval: 5_000,
  });
}
