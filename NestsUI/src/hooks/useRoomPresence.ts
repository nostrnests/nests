import { EventKind, NostrEvent, NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { createContext, useContext, useMemo } from "react";

export default function useRoomPresence(link?: NostrLink) {
  const subPresence = useMemo(() => {
    if (!link) return;
    const rb = new RequestBuilder(`presence:${link.id}`);
    rb.withOptions({ leaveOpen: true })
      .withFilter()
      .kinds([10312 as EventKind])
      .tag("a", [`${link.kind}:${link.author}:${link.id}`]);

    return rb;
  }, [link]);
  const presenceEvents = useRequestBuilder(subPresence);
  return presenceEvents.filter((a) => link?.referencesThis(a));
}

export const RoomPresenceContext = createContext<Array<NostrEvent>>([]);

export function useUserPresence(pk: string) {
  const ctx = useContext(RoomPresenceContext);

  return ctx.find((a) => a.pubkey === pk);
}
