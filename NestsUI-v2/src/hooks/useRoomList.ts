import { useNostr } from "@nostrify/react";
import { useQuery } from "@tanstack/react-query";
import type { NostrEvent } from "@nostrify/nostrify";
import { ROOM_KIND } from "@/lib/const";

/** How far back to look for rooms (7 days) */
const ROOM_LOOKBACK_SECONDS = 7 * 24 * 60 * 60;

/** How far in the future a planned room can be scheduled (30 days) */
const PLANNED_MAX_FUTURE_SECONDS = 30 * 24 * 60 * 60;

/** Max age for a planned room's start time before it's considered stale (1 hour past) */
const PLANNED_STALE_SECONDS = 60 * 60;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** Validate that a room event has the minimum required tags for the MoQ-based system. */
function isValidRoom(event: NostrEvent): boolean {
  const d = event.tags.find(([t]) => t === "d")?.[1];
  const title = event.tags.find(([t]) => t === "title")?.[1];
  const streaming = event.tags.find(([t]) => t === "streaming")?.[1];

  if (!d || !title) return false;

  // Must have a streaming URL that is a proper HTTPS endpoint (not internal URLs)
  if (!streaming || !streaming.startsWith("https://")) return false;

  // Reject old LiveKit-style streaming URLs
  if (event.tags.some(([t, v]) => t === "streaming" && v?.startsWith("wss+livekit://"))) return false;

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
      const now = nowSeconds();

      const events = await nostr.query(
        [{
          kinds: [ROOM_KIND],
          since: now - ROOM_LOOKBACK_SECONDS,
          limit: 200,
        }],
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

        if (status === "live") {
          live.push(room);
        } else if (status === "planned") {
          const starts = getStarts(room);
          // Only show planned rooms that haven't gone stale
          // (start time is in the future, or at most 1 hour in the past)
          if (starts > now - PLANNED_STALE_SECONDS && starts < now + PLANNED_MAX_FUTURE_SECONDS) {
            planned.push(room);
          }
        } else if (status === "ended") {
          ended.push(room);
        }
      }

      // Sort: live by newest first, planned by soonest first, ended by newest first
      live.sort((a, b) => b.created_at - a.created_at);
      planned.sort((a, b) => getStarts(a) - getStarts(b));
      ended.sort((a, b) => b.created_at - a.created_at);

      return { live, planned, ended, all: rooms };
    },
    refetchInterval: 30_000,
  });
}
