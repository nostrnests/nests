import { useNostr } from "@nostrify/react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMutation } from "@tanstack/react-query";
import type { NostrEvent } from "@nostrify/nostrify";

/**
 * Hook that re-signs and re-publishes a modified Nostr event.
 * Useful for editing room events (kind:30312).
 */
export function useEventModifier() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async (event: Omit<NostrEvent, "id" | "pubkey" | "sig">) => {
      if (!user) throw new Error("User is not logged in");

      const signed = await user.signer.signEvent({
        kind: event.kind,
        content: event.content,
        tags: event.tags,
        created_at: Math.floor(Date.now() / 1000),
      });

      await nostr.event(signed, { signal: AbortSignal.timeout(5000) });
      return signed;
    },
    onError: (error) => {
      console.error("Failed to modify event:", error);
    },
  });
}
