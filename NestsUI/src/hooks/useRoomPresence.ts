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
  const { sendPresence, interval, hand } = usePresence(link);
  const { isVisible } = usePageVisibility();
  const wasHiddenRef = useRef(false);

  // Regular interval for presence
  useEffect(() => {
    if (link?.id) {
      const t = setInterval(async () => {
        await sendPresence();
      }, interval * 1000);
      return () => clearInterval(t);
    }
  }, [sendPresence, link?.id, interval]);

  // Send presence when hand state changes
  useEffect(() => {
    sendPresence();
  }, [hand, sendPresence]);

  // Track visibility and send presence immediately when page becomes visible
  useEffect(() => {
    if (!isVisible) {
      wasHiddenRef.current = true;
    } else if (wasHiddenRef.current && link?.id) {
      // Page just became visible after being hidden - send presence immediately
      console.debug("Page became visible, sending presence immediately");
      sendPresence();
      wasHiddenRef.current = false;
    }
  }, [isVisible, link?.id, sendPresence]);
}

export function useUserPresence(pk: string) {
  const ctx = useNostrRoom();
  return ctx.presence.find((a) => a.pubkey === pk);
}
