import { EventKind, NostrEvent, NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { createContext, useContext, useEffect, useMemo } from "react";
import usePresence from "./usePresence";

export default function useRoomPresence(link: NostrLink | undefined, inRoom: boolean) {
  const subPresence = useMemo(() => {
    if (!link) return;
    const rb = new RequestBuilder(`presence:${link.id}`);
    rb.withOptions({ leaveOpen: true })
      .withFilter()
      .kinds([10312 as EventKind])
      .tag("a", [`${link.kind}:${link.author}:${link.id}`]);

    return rb;
  }, [link]);

  const { sendPresence, interval } = usePresence(link);
  useEffect(() => {
    if (link?.id && inRoom) {
      sendPresence();
      const t = setInterval(async () => {
        await sendPresence();
      }, interval * 1000);
      return () => clearInterval(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRoom, link?.id]);

  const presenceEvents = useRequestBuilder(subPresence);
  return presenceEvents.filter((a) => link?.referencesThis(a));
}

export const RoomPresenceContext = createContext<Array<NostrEvent>>([]);

export function useUserPresence(pk: string) {
  const ctx = useContext(RoomPresenceContext);
  return ctx.find((a) => a.pubkey === pk);
}
