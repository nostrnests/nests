import { NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useEffect, useMemo } from "react";
import usePresence, { PRESENCE_TIME } from "./usePresence";
import { useNostrRoom } from "./nostr-room-context";
import { ROOM_PRESENCE } from "../const";
import { unixNow } from "@snort/shared";

export default function useRoomPresence(link?: NostrLink) {
  const subPresence = useMemo(() => {
    if (!link) return;
    const rb = new RequestBuilder(`presence:${link.id}`);
    rb.withOptions({ leaveOpen: true })
      .withFilter()
      .kinds([ROOM_PRESENCE])
      .tag("a", [`${link.kind}:${link.author}:${link.id}`])
      .since(unixNow() - PRESENCE_TIME * 10);

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
  useEffect(() => {
    if (link?.id) {
      const t = setInterval(async () => {
        await sendPresence();
      }, interval * 1000);
      return () => clearInterval(t);
    }
  }, [sendPresence, link?.id, interval]);
  useEffect(() => {
    sendPresence();
  }, [hand, sendPresence]);
}

export function useUserPresence(pk: string) {
  const ctx = useNostrRoom();
  return ctx.presence.find((a) => a.pubkey === pk);
}
