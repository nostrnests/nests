import { NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useEffect, useMemo } from "react";
import usePresence from "./usePresence";
import { useNostrRoom } from "./nostr-room-context";
import { ROOM_PRESENCE } from "../const";
import { unixNow } from "@snort/shared";

export default function useRoomPresence(link: NostrLink | undefined, inRoom: boolean) {
  const subPresence = useMemo(() => {
    if (!link) return;
    const rb = new RequestBuilder(`presence:${link.id}`);
    rb.withOptions({ leaveOpen: true })
      .withFilter()
      .kinds([ROOM_PRESENCE])
      .tag("a", [`${link.kind}:${link.author}:${link.id}`]);

    return rb;
  }, [link]);

  const { sendPresence, interval, hand } = usePresence(link);
  useEffect(() => {
    if (link?.id && inRoom) {
      const t = setInterval(async () => {
        await sendPresence();
      }, interval * 1000);
      return () => clearInterval(t);
    }
  }, [sendPresence, inRoom, link?.id, interval]);
  useEffect(() => {
    if (inRoom) {
      sendPresence();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRoom, hand]);

  const presenceEvents = useRequestBuilder(subPresence);
  return presenceEvents.filter((a) => link?.referencesThis(a) && a.created_at > unixNow() - interval);
}

export function useUserPresence(pk: string) {
  const ctx = useNostrRoom();
  return ctx.presence.find((a) => a.pubkey === pk);
}
