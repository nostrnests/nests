import { useNostr } from "@nostrify/react";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { useCurrentUser } from "./useCurrentUser";
import { useRoomRelays } from "@/hooks/useRoomRelays";

import type { NostrEvent } from "@nostrify/nostrify";

/**
 * Publish a Nostr event.
 *
 * When invoked from inside a `RoomRelaysProvider`, the publish is routed
 * through the room's effective relay set (user NIP-65 relays union the
 * room event's `relays` tag and naddr hints), so chat/presence/reaction
 * events land on every relay other participants are listening to —
 * including relays added by other clients.
 *
 * Outside a room, behavior is unchanged: the global pool's `eventRouter`
 * (NIP-65 write relays) is used.
 */
export function useNostrPublish(): UseMutationResult<NostrEvent> {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const roomRelays = useRoomRelays();

  return useMutation({
    mutationFn: async (t: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>) => {
      if (user) {
        const tags = t.tags ?? [];

        // Add the client tag if it doesn't exist
        if (location.protocol === "https:" && !tags.some(([name]) => name === "client")) {
          tags.push(["client", location.hostname]);
        }

        const event = await user.signer.signEvent({
          kind: t.kind,
          content: t.content ?? "",
          tags,
          created_at: t.created_at ?? Math.floor(Date.now() / 1000),
        });

        await nostr.event(event, {
          signal: AbortSignal.timeout(5000),
          // When inside a room, force-route through the room's effective
          // relay set instead of relying on the pool's default eventRouter.
          ...(roomRelays && roomRelays.length > 0 ? { relays: roomRelays } : {}),
        });
        return event;
      } else {
        throw new Error("User is not logged in");
      }
    },
    onError: (error) => {
      console.error("Failed to publish event:", error);
    },
    onSuccess: (data) => {
      console.log("Event published successfully:", data);
    },
  });
}