import { useNostr } from "@nostrify/react";
import { useQuery } from "@tanstack/react-query";
import type { NostrEvent } from "@nostrify/nostrify";
import { ROOM_KIND } from "@/lib/const";

/** Validate that a room event has the minimum required tags. */
function isValidRoom(event: NostrEvent): boolean {
  const d = event.tags.find(([t]) => t === "d")?.[1];
  const title = event.tags.find(([t]) => t === "title")?.[1];
  const streaming = event.tags.find(([t]) => t === "streaming")?.[1];
  if (!d || !title) return false;
  // Must have a streaming URL that looks like an HTTP endpoint
  if (!streaming || !streaming.startsWith("http")) return false;
  return true;
}

function getStatus(event: NostrEvent): string {
  return event.tags.find(([t]) => t === "status")?.[1] ?? "live";
}

function getStarts(event: NostrEvent): number {
  const s = event.tags.find(([t]) => t === "starts")?.[1];
  return s ? parseInt(s, 10) : event.created_at;
}

export function useRoomList() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ["nostr", "room-list"],
    queryFn: async () => {
      const events = await nostr.query(
        [{ kinds: [ROOM_KIND], limit: 200 }],
        { signal: AbortSignal.timeout(5000) },
      );

      const valid = events.filter(isValidRoom);

      // Deduplicate by author+d-tag (keep latest)
      const seen = new Map<string, NostrEvent>();
      for (const event of valid) {
        const d = event.tags.find(([t]) => t === "d")![1];
        const key = `${event.pubkey}:${d}`;
        const existing = seen.get(key);
        if (!existing || event.created_at > existing.created_at) {
          seen.set(key, event);
        }
      }

      const rooms = Array.from(seen.values());

      const live: NostrEvent[] = [];
      const planned: NostrEvent[] = [];
      const ended: NostrEvent[] = [];

      for (const room of rooms) {
        const status = getStatus(room);
        if (status === "live") live.push(room);
        else if (status === "planned") planned.push(room);
        else if (status === "ended") ended.push(room);
      }

      // Sort live by created_at descending, planned by starts ascending, ended by created_at descending
      live.sort((a, b) => b.created_at - a.created_at);
      planned.sort((a, b) => getStarts(a) - getStarts(b));
      ended.sort((a, b) => b.created_at - a.created_at);

      return { live, planned, ended, all: rooms };
    },
    refetchInterval: 30_000,
  });
}
