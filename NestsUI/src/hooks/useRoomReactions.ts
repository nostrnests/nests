import { EventKind, NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";
import { useNostrRoom } from "./nostr-room-context";

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

export function useUserRoomReactions(pk: string) {
  const ctx = useNostrRoom();
  return ctx.reactions.filter((a) => a.pubkey === pk);
}
