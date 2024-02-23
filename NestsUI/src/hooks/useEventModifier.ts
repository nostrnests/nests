import { unixNow } from "@snort/shared";
import { EventExt, NostrEvent } from "@snort/system";
import { useLogin } from "../login";
import { useContext } from "react";
import { SnortContext } from "@snort/system-react";

export default function useEventModifier() {
  const login = useLogin();
  const system = useContext(SnortContext);

  return {
    update: async (event: NostrEvent) => {
      event.created_at = unixNow();
      event.id = EventExt.createId(event);
      const signed = await login.signer?.sign(event);
      console.debug(signed);
      if (signed) {
        await system.BroadcastEvent(signed);
      }
      return signed;
    },
  };
}
