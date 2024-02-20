import { EventBuilder, NostrLink } from "@snort/system";
import useEventBuilder from "./useEventBuilder";
import { useLogin } from "../login";
import { useCallback } from "react";
import { ROOM_PRESENCE } from "../const";

export const PRESENCE_TIME = 60 * 2;
export default function usePresence(link?: NostrLink) {
  const { signer, system } = useEventBuilder();
  const login = useLogin();
  const hand = login.handMap.includes(link?.id ?? "");

  const sendPresence = useCallback(async () => {
    if (!signer || !link) return;
    const builder = new EventBuilder();
    builder.kind(ROOM_PRESENCE).tag(link.toEventTag()!);

    if (hand) {
      builder.tag(["hand", hand ? "1" : "0"]);
    }
    const ev = await builder.buildAndSign(signer);
    await system.BroadcastEvent(ev);
  }, [signer, link, hand, system]);

  return { sendPresence, interval: PRESENCE_TIME, hand };
}
