import { EventKind, NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useMemo } from "react";

export default function useRoomPresence(link: NostrLink) {
  const subPresence = useMemo(() => {
    const rb = new RequestBuilder(`presence:${link.id}`);
    rb.withOptions({ leaveOpen: true })
      .withFilter()
      .kinds([10312 as EventKind])
      .tag("a", [`${link.kind}:${link.author}:${link.id}`]);

    return rb;
  }, [link]);

  const presenceEvents = useRequestBuilder(subPresence);

  return presenceEvents;
}
