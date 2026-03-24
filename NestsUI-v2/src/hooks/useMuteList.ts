import { useNostr } from "@nostrify/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useCallback } from "react";

const MUTE_LIST_KIND = 10000;

/**
 * Manage NIP-51 public mute list (kind:10000).
 */
export function useMuteList() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["nostr", "mute-list", user?.pubkey ?? ""],
    queryFn: async () => {
      if (!user) return [];

      const events = await nostr.query(
        [{ kinds: [MUTE_LIST_KIND], authors: [user.pubkey], limit: 1 }],
        { signal: AbortSignal.timeout(3000) },
      );

      if (events.length === 0) return [];

      return events[0].tags
        .filter(([t]) => t === "p")
        .map(([, pubkey]) => pubkey);
    },
    enabled: !!user,
  });

  const mutedPubkeys = query.data ?? [];

  const isMuted = useCallback(
    (pubkey: string) => mutedPubkeys.includes(pubkey),
    [mutedPubkeys],
  );

  const addMute = useCallback(
    async (pubkey: string) => {
      if (!user) return;
      const newList = [...mutedPubkeys.filter((pk) => pk !== pubkey), pubkey];
      const tags = newList.map((pk) => ["p", pk]);

      await createEvent({
        kind: MUTE_LIST_KIND,
        content: "",
        tags,
        created_at: Math.floor(Date.now() / 1000),
      });

      queryClient.invalidateQueries({ queryKey: ["nostr", "mute-list"] });
    },
    [user, mutedPubkeys, createEvent, queryClient],
  );

  const removeMute = useCallback(
    async (pubkey: string) => {
      if (!user) return;
      const newList = mutedPubkeys.filter((pk) => pk !== pubkey);
      const tags = newList.map((pk) => ["p", pk]);

      await createEvent({
        kind: MUTE_LIST_KIND,
        content: "",
        tags,
        created_at: Math.floor(Date.now() / 1000),
      });

      queryClient.invalidateQueries({ queryKey: ["nostr", "mute-list"] });
    },
    [user, mutedPubkeys, createEvent, queryClient],
  );

  return {
    mutedPubkeys,
    isLoading: query.isLoading,
    isMuted,
    addMute,
    removeMute,
  };
}
