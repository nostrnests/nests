import { useNostr } from "@nostrify/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { NostrEvent } from "@nostrify/nostrify";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useCallback } from "react";

const MUTE_LIST_KIND = 10000;

/**
 * Manage NIP-51 public mute list (kind:10000).
 * Preserves all existing tags (e, t, word, etc.) when adding/removing pubkeys.
 */
export function useMuteList() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["nostr", "mute-list", user?.pubkey ?? ""],
    queryFn: async (): Promise<NostrEvent | null> => {
      if (!user) return null;

      const events = await nostr.query(
        [{ kinds: [MUTE_LIST_KIND], authors: [user.pubkey], limit: 1 }],
        { signal: AbortSignal.timeout(3000) },
      );

      return events[0] ?? null;
    },
    enabled: !!user,
  });

  const muteEvent = query.data;
  const mutedPubkeys = muteEvent?.tags
    .filter(([t]) => t === "p")
    .map(([, pk]) => pk) ?? [];

  const isMuted = useCallback(
    (pubkey: string) => mutedPubkeys.includes(pubkey),
    [mutedPubkeys],
  );

  const addMute = useCallback(
    async (pubkey: string) => {
      if (!user) return;
      // Preserve all existing tags, add new p tag
      const existingTags = muteEvent?.tags ?? [];
      if (existingTags.some(([t, pk]) => t === "p" && pk === pubkey)) return;

      await createEvent({
        kind: MUTE_LIST_KIND,
        content: muteEvent?.content ?? "",
        tags: [...existingTags, ["p", pubkey]],
        created_at: Math.floor(Date.now() / 1000),
      });

      queryClient.invalidateQueries({ queryKey: ["nostr", "mute-list"] });
    },
    [user, muteEvent, createEvent, queryClient],
  );

  const removeMute = useCallback(
    async (pubkey: string) => {
      if (!user) return;
      // Preserve all non-matching tags
      const existingTags = muteEvent?.tags ?? [];
      const newTags = existingTags.filter(([t, pk]) => !(t === "p" && pk === pubkey));

      await createEvent({
        kind: MUTE_LIST_KIND,
        content: muteEvent?.content ?? "",
        tags: newTags,
        created_at: Math.floor(Date.now() / 1000),
      });

      queryClient.invalidateQueries({ queryKey: ["nostr", "mute-list"] });
    },
    [user, muteEvent, createEvent, queryClient],
  );

  return {
    mutedPubkeys,
    isLoading: query.isLoading,
    isMuted,
    addMute,
    removeMute,
  };
}
