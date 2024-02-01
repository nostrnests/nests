import { unixNow } from "@snort/shared";
import { EventBuilder, EventKind, NostrLink } from "@snort/system";
import useEventBuilder from "./useEventBuilder";

export default function usePresence(link: NostrLink) {
  const { signer, system } = useEventBuilder();
  const interval = 60 * 2;

  async function sendPresence() {
    const builder = new EventBuilder();
    builder
      .kind(10312 as EventKind)
      .tag(link.toEventTag()!)
      .tag(["expiration", String(unixNow() + interval)]);
    const ev = await builder.buildAndSign(signer);
    await system.BroadcastEvent(ev);
  }

  return { sendPresence, interval };
}
