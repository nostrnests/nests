import { useMemo, useCallback, useState, useEffect } from "react";
import { EventBuilder, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useLogin } from "../login";
import useEventBuilder from "./useEventBuilder";
import { DefaultMoQServers, MOQ_SERVER_LIST } from "../const";

/**
 * Hook to manage the user's MoQ server list (kind:10112).
 *
 * Returns the current list of servers and methods to add/remove/reorder them.
 * Falls back to DefaultMoQServers if the user hasn't published a list.
 */
export function useMoqServerList() {
  const login = useLogin();
  const { system, signer } = useEventBuilder();

  // Fetch user's existing kind:10112 event
  const sub = useMemo(() => {
    const rb = new RequestBuilder(`moq-servers:${login.pubkey}`);
    if (login.pubkey) {
      rb.withFilter().kinds([MOQ_SERVER_LIST]).authors([login.pubkey]);
    }
    return rb;
  }, [login.pubkey]);

  const events = useRequestBuilder(sub);

  // Extract servers from the most recent event
  const existingEvent = events.length > 0 ? events[0] : undefined;
  const savedServers = useMemo(() => {
    if (!existingEvent) return null;
    return existingEvent.tags
      .filter((t) => t[0] === "server")
      .map((t) => t[1]);
  }, [existingEvent]);

  // Local state for editing (initialized from saved or defaults)
  const [servers, setServers] = useState<string[]>(DefaultMoQServers);
  const [dirty, setDirty] = useState(false);

  // Sync from Nostr when data arrives
  useEffect(() => {
    if (savedServers !== null) {
      setServers(savedServers);
      setDirty(false);
    }
  }, [savedServers]);

  const addServer = useCallback((url: string) => {
    const normalized = url.trim().replace(/\/+$/, "");
    if (!normalized) return;
    setServers((prev) => {
      if (prev.includes(normalized)) return prev;
      return [...prev, normalized];
    });
    setDirty(true);
  }, []);

  const removeServer = useCallback((url: string) => {
    setServers((prev) => prev.filter((s) => s !== url));
    setDirty(true);
  }, []);

  const moveServer = useCallback((from: number, to: number) => {
    setServers((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setDirty(true);
  }, []);

  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    if (!signer || !login.pubkey) return;
    setSaving(true);
    try {
      const eb = new EventBuilder();
      eb.kind(MOQ_SERVER_LIST);
      for (const server of servers) {
        eb.tag(["server", server]);
      }
      const ev = await eb.buildAndSign(signer);
      await system.BroadcastEvent(ev);
      setDirty(false);
    } catch (e) {
      console.error("Failed to publish MoQ server list:", e);
    } finally {
      setSaving(false);
    }
  }, [signer, login.pubkey, servers, system]);

  return {
    /** Current list of servers (ordered by preference) */
    servers,
    /** Whether user has a published kind:10112 event */
    hasPublished: savedServers !== null,
    /** Whether local edits differ from what's published */
    dirty,
    /** Add a server URL to the list */
    addServer,
    /** Remove a server URL from the list */
    removeServer,
    /** Move a server from one position to another */
    moveServer,
    /** Publish the current list as a kind:10112 event */
    save,
    /** Whether a save is in progress */
    saving,
  };
}
