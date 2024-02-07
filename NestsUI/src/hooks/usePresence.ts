import { unixNow } from "@snort/shared";
import { EventBuilder, EventKind, NostrLink } from "@snort/system";
import useEventBuilder from "./useEventBuilder";
import { useLogin } from "../login";
import { useEffect } from "react";

export default function usePresence(link: NostrLink) {
  const { signer, system } = useEventBuilder();
  const login = useLogin();
  const interval = 60 * 2;
  const hand = login.handMap.includes(link.id);

  useEffect(() => {
    sendPresence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hand]);

  async function sendPresence() {
    if (!signer) return;
    const builder = new EventBuilder();
    builder
      .kind(10312 as EventKind)
      .tag(link.toEventTag()!)
      .tag(["expiration", String(unixNow() + interval)]);

    if (hand) {
      builder.tag(["hand", hand ? "1" : "0"]);
    }
    const ev = await builder.buildAndSign(signer);
    await system.BroadcastEvent(ev);
  }

  return { sendPresence, interval, hand };
}
