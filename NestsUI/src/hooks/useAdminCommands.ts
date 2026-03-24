import { NostrLink, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useEffect, useMemo, useRef } from "react";
import { useLogin } from "../login";
import { ADMIN_COMMAND } from "../const";
import { unixNow } from "@snort/shared";

/**
 * Watch for admin commands (kind:4312) targeting the current user.
 * When a kick command is received from an admin, calls the onKick callback.
 */
export function useAdminCommands(
  link: NostrLink | undefined,
  admins: Set<string>,
  onKick: () => void,
) {
  const login = useLogin();
  const lastProcessedRef = useRef<string | null>(null);

  const sub = useMemo(() => {
    const rb = new RequestBuilder(`admin-cmd:${link?.id}`);
    if (link && login.pubkey) {
      rb.withOptions({ leaveOpen: true })
        .withFilter()
        .kinds([ADMIN_COMMAND])
        .tag("p", [login.pubkey])
        .since(unixNow() - 60);
    }
    return rb;
  }, [link, login.pubkey]);

  const events = useRequestBuilder(sub);

  useEffect(() => {
    if (!link || !login.pubkey) return;

    for (const ev of events) {
      // Skip already processed
      if (ev.id === lastProcessedRef.current) continue;

      // Verify it's for this room
      const roomTag = ev.tags.find(
        (t) => t[0] === "a" || t[0] === "e",
      );
      if (!roomTag) continue;

      // Verify sender is an admin/host
      if (!admins.has(ev.pubkey)) continue;

      // Check if it targets us
      const targetTag = ev.tags.find((t) => t[0] === "p" && t[1] === login.pubkey);
      if (!targetTag) continue;

      const action = ev.tags.find((t) => t[0] === "action")?.[1];
      if (action === "kick") {
        lastProcessedRef.current = ev.id;
        console.log("[admin] received kick command from", ev.pubkey.slice(0, 8));
        onKick();
      }
    }
  }, [events, link, login.pubkey, admins, onKick]);
}
