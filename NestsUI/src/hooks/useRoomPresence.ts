import { EventKind, NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useContext, useEffect, useMemo } from "react";
import usePresence from "./usePresence";
import { NostrRoomContext } from "./nostr-room-context";

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
      const t = setInterval(async () => {
        await sendPresence();
      }, interval * 1000);
      return () => clearInterval(t);
    }
  }, [sendPresence, inRoom, link?.id, interval]);

  const presenceEvents = useRequestBuilder(subPresence);
  return presenceEvents.filter((a) => link?.referencesThis(a));
}

export function useUserPresence(pk: string) {
  const ctx = useContext(NostrRoomContext);
  return ctx.presence.find((a) => a.pubkey === pk);
}
