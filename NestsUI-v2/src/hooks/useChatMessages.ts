import { useEffect, useRef, useState, useCallback } from "react";
import { useNostr } from "@nostrify/react";
import { useQueryClient } from "@tanstack/react-query";
import type { NostrEvent } from "@nostrify/nostrify";
import { LIVE_CHAT } from "@/lib/const";

/**
 * Live chat messages for a room.
 * Uses a persistent REQ subscription for real-time delivery,
 * with an initial query to backfill history.
 */
export function useChatMessages(roomATag: string | undefined) {
  const { nostr } = useNostr();
  const [messages, setMessages] = useState<NostrEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const seenIds = useRef(new Set<string>());
  const queryClient = useQueryClient();

  // Add a message if not already seen
  const addMessage = useCallback((event: NostrEvent) => {
    if (seenIds.current.has(event.id)) return;
    seenIds.current.add(event.id);
    setMessages((prev) => {
      const updated = [...prev, event];
      updated.sort((a, b) => a.created_at - b.created_at);
      return updated;
    });
  }, []);

  // Initial backfill + subscription
  useEffect(() => {
    if (!roomATag) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    seenIds.current.clear();

    let cancelled = false;
    const controller = new AbortController();

    async function start() {
      // Backfill: fetch recent history
      try {
        const events = await nostr.query(
          [{ kinds: [LIVE_CHAT], "#a": [roomATag!], limit: 200 }],
          { signal: AbortSignal.timeout(5000) },
        );

        if (cancelled) return;

        for (const e of events) {
          seenIds.current.add(e.id);
        }
        setMessages(events.sort((a, b) => a.created_at - b.created_at));
        setIsLoading(false);
      } catch {
        if (!cancelled) setIsLoading(false);
      }

      // Subscribe: listen for new messages in real-time
      try {
        for await (const msg of nostr.req(
          [{ kinds: [LIVE_CHAT], "#a": [roomATag!], since: Math.floor(Date.now() / 1000) - 10 }],
          { signal: controller.signal },
        )) {
          if (cancelled) break;
          if (msg[0] === "EVENT") {
            addMessage(msg[2] as NostrEvent);
          }
        }
      } catch {
        // Subscription ended (abort or error) — fall back to polling
        if (!cancelled) {
          startPolling();
        }
      }
    }

    // Fallback polling if subscription fails
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    function startPolling() {
      pollInterval = setInterval(async () => {
        if (cancelled) return;
        try {
          const events = await nostr.query(
            [{ kinds: [LIVE_CHAT], "#a": [roomATag!], limit: 200 }],
            { signal: AbortSignal.timeout(3000) },
          );
          if (cancelled) return;
          for (const e of events) {
            addMessage(e);
          }
        } catch {
          // ignore polling errors
        }
      }, 2000);
    }

    start();

    return () => {
      cancelled = true;
      controller.abort();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [roomATag, nostr, addMessage]);

  // Optimistically add a local message (for instant display of own messages)
  const addOptimisticMessage = useCallback((event: NostrEvent) => {
    addMessage(event);
  }, [addMessage]);

  return { data: messages, isLoading, addOptimisticMessage };
}
