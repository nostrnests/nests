import { NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useEffect, useMemo, useRef } from "react";
import usePresence, { PRESENCE_TIME } from "./usePresence";
import { useNostrRoom } from "./nostr-room-context";
import { ROOM_PRESENCE } from "../const";
import { unixNow } from "@snort/shared";
import { usePageVisibility } from "./usePageVisibility";

export default function useRoomPresence(link?: NostrLink) {
  const subPresence = useMemo(() => {
    const rb = new RequestBuilder(`presence:${link?.id}`);
    if (link) {
      rb.withOptions({ leaveOpen: true })
        .withFilter()
        .kinds([ROOM_PRESENCE])
        .tag("a", [`${link.kind}:${link.author}:${link.id}`])
        .since(unixNow() - PRESENCE_TIME * 10);
    }
    return rb;
  }, [link]);

  const presenceEvents = useRequestBuilder(subPresence);
  return useMemo(
    () => presenceEvents.filter((a) => link?.referencesThis(a) && a.created_at >= unixNow() - PRESENCE_TIME * 1.2),
    [link, presenceEvents],
  );
}

export function useSendPresence(link: NostrLink | undefined) {
  const { sendPresence, interval, hand, isReady } = usePresence(link);
  const { isVisible } = usePageVisibility();
  const wasHiddenRef = useRef(false);
  const hasInitialPresenceRef = useRef(false);

  // Send initial presence when ready (signer is available)
  useEffect(() => {
    if (link?.id && isReady && !hasInitialPresenceRef.current) {
      console.debug("Sending initial presence");
      hasInitialPresenceRef.current = true;
      sendPresence().catch((e) => {
        console.error("Failed to send initial presence:", e);
        // Reset flag to retry on next render
        hasInitialPresenceRef.current = false;
      });
    }
  }, [link?.id, isReady, sendPresence]);

  // Reset initial presence flag when room changes
  useEffect(() => {
    hasInitialPresenceRef.current = false;
  }, [link?.id]);

  // Regular interval for presence
  useEffect(() => {
    if (link?.id && isReady) {
      const t = setInterval(async () => {
        try {
          await sendPresence();
        } catch (e) {
          console.error("Failed to send presence:", e);
        }
      }, interval * 1000);
      return () => clearInterval(t);
    }
  }, [sendPresence, link?.id, interval, isReady]);

  // Send presence when hand state changes
  useEffect(() => {
    if (isReady) {
      sendPresence().catch((e) => console.error("Failed to send presence on hand change:", e));
    }
  }, [hand, sendPresence, isReady]);

  // Track visibility and send presence immediately when page becomes visible
  useEffect(() => {
    if (!isVisible) {
      wasHiddenRef.current = true;
    } else if (wasHiddenRef.current && link?.id && isReady) {
      // Page just became visible after being hidden - send presence immediately
      console.debug("Page became visible, sending presence immediately");
      sendPresence().catch((e) => console.error("Failed to send presence on visibility:", e));
      wasHiddenRef.current = false;
    }
  }, [isVisible, link?.id, sendPresence, isReady]);
}

export function useUserPresence(pk: string) {
  const ctx = useNostrRoom();
  return ctx.presence.find((a) => a.pubkey === pk);
}
