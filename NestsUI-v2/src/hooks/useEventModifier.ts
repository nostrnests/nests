import { useNostr } from "@nostrify/react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { NostrEvent } from "@nostrify/nostrify";

/**
 * Hook that re-signs and re-publishes a modified Nostr event.
 * Optimistically updates the local TanStack Query cache so the UI
 * reflects changes immediately without waiting for relay round-trip.
 */
export function useEventModifier() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: Omit<NostrEvent, "id" | "pubkey" | "sig">) => {
      if (!user) throw new Error("User is not logged in");

      const signed = await user.signer.signEvent({
        kind: event.kind,
        content: event.content,
        tags: event.tags,
        created_at: Math.floor(Date.now() / 1000),
      });

      // Optimistically update cache BEFORE publishing to relay
      // This makes the UI update instantly for the local user
      const dTag = signed.tags.find(([t]) => t === "d")?.[1];
      if (dTag) {
        queryClient.setQueryData(
          ["nostr", "room-event", signed.kind, signed.pubkey, dTag],
          signed,
        );
      }

      // Publish to relay in the background
      nostr.event(signed, { signal: AbortSignal.timeout(10000) }).catch((err) => {
        console.error("Failed to publish event to relay:", err);
      });

      return signed;
    },
    onSuccess: (signed) => {
      // Also invalidate the room list so lobby refreshes
      queryClient.invalidateQueries({ queryKey: ["nostr", "room-list"] });
    },
    onError: (error) => {
      console.error("Failed to modify event:", error);
    },
  });
}
