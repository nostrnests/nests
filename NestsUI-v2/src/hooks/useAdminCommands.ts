import { useNostr } from "@nostrify/react";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { NostrEvent } from "@nostrify/nostrify";
import { ADMIN_COMMAND } from "@/lib/const";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface UseAdminCommandsOptions {
  /** The room event to monitor commands for */
  roomEvent: NostrEvent | undefined;
  /** Callback when a kick command targeting the current user is received */
  onKick?: () => void;
}

/**
 * Watch for kind:4312 admin command events targeting the current user.
 * Admin commands must come from the room host or an admin.
 */
export function useAdminCommands({ roomEvent, onKick }: UseAdminCommandsOptions) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const processedRef = useRef(new Set<string>());

  // Get list of admin pubkeys for validation
  const adminPubkeys = roomEvent
    ? [
      roomEvent.pubkey, // host is always admin
      ...roomEvent.tags
        .filter(([t, , , role]) => t === "p" && role === "admin")
        .map(([, pk]) => pk),
    ]
    : [];

  const roomATag = roomEvent
    ? `${roomEvent.kind}:${roomEvent.pubkey}:${roomEvent.tags.find(([t]) => t === "d")?.[1] ?? ""}`
    : undefined;

  const query = useQuery({
    queryKey: ["nostr", "admin-commands", roomATag ?? "", user?.pubkey ?? ""],
    queryFn: async () => {
      if (!user || !roomATag || adminPubkeys.length === 0) return [];

      const events = await nostr.query(
        [{
          kinds: [ADMIN_COMMAND],
          authors: adminPubkeys,
          "#p": [user.pubkey],
          "#a": [roomATag],
          since: Math.floor(Date.now() / 1000) - 60,
          limit: 10,
        }],
        { signal: AbortSignal.timeout(3000) },
      );

      return events;
    },
    enabled: !!user && !!roomATag && adminPubkeys.length > 0,
    refetchInterval: 5_000,
  });

  // Process new commands
  useEffect(() => {
    if (!query.data || !user) return;

    for (const event of query.data) {
      if (processedRef.current.has(event.id)) continue;
      processedRef.current.add(event.id);

      const action = event.tags.find(([t]) => t === "action")?.[1];
      if (action === "kick") {
        onKick?.();
      }
    }
  }, [query.data, user, onKick]);
}
