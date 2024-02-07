import { EventKind, NostrEvent, NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { createContext, useContext, useMemo } from "react";

export function useRoomReactions(link?: NostrLink) {
  const sub = useMemo(() => {
    if (!link) return;
    const rb = new RequestBuilder(`reactions:${link.id}`);
    rb.withOptions({ leaveOpen: true })
      .withFilter()
      .kinds([EventKind.Reaction, EventKind.ZapReceipt])
      .tag("a", [`${link.kind}:${link.author}:${link.id}`]);

    return rb;
  }, [link]);
  const reactions = useRequestBuilder(sub);
  return reactions.filter((a) => link?.referencesThis(a));
}

export const RoomReactions = createContext<Array<NostrEvent>>([]);

export function useUserRoomReactions(pk: string) {
  const ctx = useContext(RoomReactions);
  return ctx?.filter((a) => a.pubkey === pk);
}
