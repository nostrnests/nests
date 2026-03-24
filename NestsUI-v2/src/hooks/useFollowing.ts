import { useNostr } from "@nostrify/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useCallback } from "react";

const CONTACT_LIST_KIND = 3;

/**
 * Manage contact list (kind:3).
 */
export function useFollowing() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["nostr", "contacts", user?.pubkey ?? ""],
    queryFn: async () => {
      if (!user) return { contacts: [] as string[], event: undefined as undefined };

      const events = await nostr.query(
        [{ kinds: [CONTACT_LIST_KIND], authors: [user.pubkey], limit: 1 }],
        { signal: AbortSignal.timeout(3000) },
      );

      if (events.length === 0) return { contacts: [] as string[], event: undefined as undefined };

      const contacts = events[0].tags
        .filter(([t]) => t === "p")
        .map(([, pubkey]) => pubkey);

      return { contacts, event: events[0] };
    },
    enabled: !!user,
  });

  const contacts = query.data?.contacts ?? [];

  const isFollowing = useCallback(
    (pubkey: string) => contacts.includes(pubkey),
    [contacts],
  );

  const follow = useCallback(
    async (pubkey: string) => {
      if (!user || !query.data) return;

      // Preserve existing tags (including relay hints) and add new contact
      const existingEvent = query.data.event;
      const existingTags = existingEvent?.tags ?? [];
      const hasPubkey = existingTags.some(([t, pk]) => t === "p" && pk === pubkey);

      if (hasPubkey) return;

      const newTags = [...existingTags, ["p", pubkey]];

      await createEvent({
        kind: CONTACT_LIST_KIND,
        content: existingEvent?.content ?? "",
        tags: newTags,
        created_at: Math.floor(Date.now() / 1000),
      });

      queryClient.invalidateQueries({ queryKey: ["nostr", "contacts"] });
    },
    [user, query.data, createEvent, queryClient],
  );

  const unfollow = useCallback(
    async (pubkey: string) => {
      if (!user || !query.data) return;

      const existingEvent = query.data.event;
      const existingTags = existingEvent?.tags ?? [];

      const newTags = existingTags.filter(([t, pk]) => !(t === "p" && pk === pubkey));

      await createEvent({
        kind: CONTACT_LIST_KIND,
        content: existingEvent?.content ?? "",
        tags: newTags,
        created_at: Math.floor(Date.now() / 1000),
      });

      queryClient.invalidateQueries({ queryKey: ["nostr", "contacts"] });
    },
    [user, query.data, createEvent, queryClient],
  );

  return {
    contacts,
    isLoading: query.isLoading,
    isFollowing,
    follow,
    unfollow,
  };
}
