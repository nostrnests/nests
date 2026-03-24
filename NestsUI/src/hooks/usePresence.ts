import { EventBuilder, NostrLink } from "@snort/system";
import useEventBuilder from "./useEventBuilder";
import { useLogin } from "../login";
import { useCallback, useMemo } from "react";
import { ROOM_PRESENCE } from "../const";
import { useLocalParticipant } from "../transport";

export const PRESENCE_TIME = 60 * 2;
export default function usePresence(link?: NostrLink) {
  const { signer, system } = useEventBuilder();
  const login = useLogin();
  const hand = login.handMap?.includes(link?.id ?? "");
  const { isMicEnabled, isPublishing } = useLocalParticipant();

  // Check if we're ready to send presence (have a signer or are a guest)
  const isReady = useMemo(() => {
    if (login.type !== "none") {
      return !!signer;
    }
    return true;
  }, [login.type, signer]);

  const sendPresence = useCallback(async () => {
    if (!signer || !link) {
      if (login.type === "none") return;
      console.debug("Cannot send presence: no signer or link");
      return;
    }
    const builder = new EventBuilder();
    builder.kind(ROOM_PRESENCE).tag(link.toEventTag()!);

    if (hand) {
      builder.tag(["hand", "1"]);
    }

    // Include mic/publishing state so other participants can see mute status
    if (isPublishing) {
      builder.tag(["publishing", "1"]);
      builder.tag(["muted", isMicEnabled ? "0" : "1"]);
    }

    const ev = await builder.buildAndSign(signer);
    try {
      await system.BroadcastEvent(ev);
      console.debug("Presence sent successfully");
    } catch (e) {
      console.debug("Presence broadcast partially failed (some relays may be read-only):", e);
    }
  }, [signer, link, hand, isMicEnabled, isPublishing, system, login.type]);

  return { sendPresence, interval: PRESENCE_TIME, hand, isMicEnabled, isPublishing, isReady };
}
