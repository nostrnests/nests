import { EventBuilder, NostrLink } from "@snort/system";
import useEventBuilder from "./useEventBuilder";
import { useLogin } from "../login";
import { useCallback, useMemo } from "react";
import { ROOM_PRESENCE } from "../const";

export const PRESENCE_TIME = 60 * 2;
export default function usePresence(link?: NostrLink) {
  const { signer, system } = useEventBuilder();
  const login = useLogin();
  const hand = login.handMap?.includes(link?.id ?? "");

  // Check if we're ready to send presence (have a signer or are a guest)
  // Guests can still be in the room, they just won't publish presence
  const isReady = useMemo(() => {
    // If user is logged in, we need a signer
    if (login.type !== "none") {
      return !!signer;
    }
    // Guests are always "ready" but sendPresence will be a no-op
    return true;
  }, [login.type, signer]);

  const sendPresence = useCallback(async () => {
    if (!signer || !link) {
      // Guests don't publish presence, but this isn't an error
      if (login.type === "none") return;
      console.debug("Cannot send presence: no signer or link");
      return;
    }
    const builder = new EventBuilder();
    builder.kind(ROOM_PRESENCE).tag(link.toEventTag()!);

    if (hand) {
      builder.tag(["hand", hand ? "1" : "0"]);
    }
    const ev = await builder.buildAndSign(signer);
    await system.BroadcastEvent(ev);
    console.debug("Presence sent successfully");
  }, [signer, link, hand, system, login.type]);

  return { sendPresence, interval: PRESENCE_TIME, hand, isReady };
}
