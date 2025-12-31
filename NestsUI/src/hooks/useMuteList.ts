import { useCallback, useEffect, useMemo, useState } from "react";
import { EventBuilder, EventKind, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useLogin } from "../login";
import useEventBuilder from "./useEventBuilder";
import { DefaultRelays } from "../const";

// NIP-51: Public mute list
const MUTE_LIST_KIND = 10000 as EventKind;

// Indexer relays that aggregate mute lists
const IndexerRelays = [
  "wss://purplepag.es",
  "wss://user.kindpag.es",
  "wss://relay.nos.social",
];

/**
 * Hook to fetch and manage mute lists.
 * Fetches the current user's mute list and optionally other pubkeys' mute lists (e.g., room host).
 */
export default function useMuteList(additionalPubkeys?: string[]) {
  const login = useLogin();
  const { system, signer } = useEventBuilder();
  const [localMutes, setLocalMutes] = useState<Set<string>>(new Set());

  // Subscribe to mute lists for user and additional pubkeys
  const muteListSub = useMemo(() => {
    const pubkeys = [...(login.pubkey ? [login.pubkey] : []), ...(additionalPubkeys ?? [])];
    if (pubkeys.length === 0) return null;

    const rb = new RequestBuilder(`mute-lists:${pubkeys.join(",").slice(0, 20)}`);
    rb.withOptions({ leaveOpen: true })
      .withFilter()
      .kinds([MUTE_LIST_KIND])
      .authors(pubkeys);

    return rb;
  }, [login.pubkey, additionalPubkeys]);

  const muteListEvents = useRequestBuilder(muteListSub ?? new RequestBuilder("empty"));

  // Extract muted pubkeys from user's mute list
  const userMutes = useMemo(() => {
    if (!login.pubkey) return new Set<string>();

    const userEvent = muteListEvents
      .filter((e) => e.pubkey === login.pubkey)
      .sort((a, b) => b.created_at - a.created_at)[0];

    if (!userEvent) return localMutes;

    const muted = new Set<string>();
    for (const tag of userEvent.tags) {
      if (tag[0] === "p" && tag[1]) {
        muted.add(tag[1]);
      }
    }
    return muted;
  }, [muteListEvents, login.pubkey, localMutes]);

  // Extract muted pubkeys from additional pubkeys' mute lists (e.g., room host)
  const additionalMutes = useMemo(() => {
    const muted = new Set<string>();
    if (!additionalPubkeys) return muted;

    for (const pubkey of additionalPubkeys) {
      const event = muteListEvents
        .filter((e) => e.pubkey === pubkey)
        .sort((a, b) => b.created_at - a.created_at)[0];

      if (event) {
        for (const tag of event.tags) {
          if (tag[0] === "p" && tag[1]) {
            muted.add(tag[1]);
          }
        }
      }
    }
    return muted;
  }, [muteListEvents, additionalPubkeys]);

  // Combined mutes (user + additional)
  const allMutes = useMemo(() => {
    const combined = new Set<string>(userMutes);
    for (const pk of additionalMutes) {
      combined.add(pk);
    }
    return combined;
  }, [userMutes, additionalMutes]);

  // Get user's write relays
  const getWriteRelays = useCallback((): string[] => {
    const writeRelays: string[] = [];
    if (login.relays) {
      for (const [url, settings] of Object.entries(login.relays)) {
        if (settings.write) {
          writeRelays.push(url);
        }
      }
    }
    return writeRelays.length > 0 ? writeRelays : DefaultRelays;
  }, [login.relays]);

  // Fetch the latest mute list from relays
  const fetchLatestMuteList = useCallback(async (): Promise<string[]> => {
    if (!login.pubkey) return [];

    const writeRelays = getWriteRelays();

    // Connect to indexer relays
    for (const relay of IndexerRelays) {
      try {
        await system.ConnectToRelay(relay, { read: true, write: false });
      } catch (e) {
        console.debug("Failed to connect to indexer relay:", relay, e);
      }
    }

    // Connect to user's write relays
    for (const relay of writeRelays) {
      try {
        await system.ConnectToRelay(relay, { read: true, write: true });
      } catch (e) {
        console.debug("Failed to connect to relay:", relay, e);
      }
    }

    try {
      const rb = new RequestBuilder(`mute-list-fetch:${login.pubkey.slice(0, 12)}`);
      rb.withFilter().authors([login.pubkey]).kinds([MUTE_LIST_KIND]).limit(1);

      const events = await system.Fetch(rb);
      if (events.length > 0) {
        const latest = events.reduce((acc, v) => (acc.created_at > v.created_at ? acc : v), events[0]);
        return latest.tags.filter((t) => t[0] === "p").map((t) => t[1]);
      }
    } catch (e) {
      console.error("Failed to fetch mute list:", e);
    }

    return [];
  }, [login.pubkey, system, getWriteRelays]);

  // Mute a user
  const mute = useCallback(async (pubkey: string) => {
    if (!signer || !login.pubkey) return;

    // Optimistically update local state
    setLocalMutes((prev) => new Set([...prev, pubkey]));

    // Fetch latest mute list to avoid overwriting
    const currentMutes = await fetchLatestMuteList();

    if (currentMutes.includes(pubkey)) {
      console.debug("Already muted", pubkey);
      return;
    }

    const newMutes = [...currentMutes, pubkey];

    const eb = new EventBuilder();
    eb.kind(MUTE_LIST_KIND);
    for (const pk of newMutes) {
      eb.tag(["p", pk]);
    }

    const ev = await eb.buildAndSign(signer);

    const writeRelays = getWriteRelays();
    for (const relay of writeRelays) {
      try {
        await system.ConnectToRelay(relay, { read: true, write: true });
      } catch (e) {
        console.debug("Failed to connect to relay:", relay, e);
      }
    }

    await system.BroadcastEvent(ev);
    console.debug("Muted user:", pubkey);
  }, [signer, login.pubkey, system, fetchLatestMuteList, getWriteRelays]);

  // Unmute a user
  const unmute = useCallback(async (pubkey: string) => {
    if (!signer || !login.pubkey) return;

    // Optimistically update local state
    setLocalMutes((prev) => {
      const next = new Set(prev);
      next.delete(pubkey);
      return next;
    });

    // Fetch latest mute list to avoid overwriting
    const currentMutes = await fetchLatestMuteList();

    if (!currentMutes.includes(pubkey)) {
      console.debug("Not muted", pubkey);
      return;
    }

    const newMutes = currentMutes.filter((pk) => pk !== pubkey);

    const eb = new EventBuilder();
    eb.kind(MUTE_LIST_KIND);
    for (const pk of newMutes) {
      eb.tag(["p", pk]);
    }

    const ev = await eb.buildAndSign(signer);

    const writeRelays = getWriteRelays();
    for (const relay of writeRelays) {
      try {
        await system.ConnectToRelay(relay, { read: true, write: true });
      } catch (e) {
        console.debug("Failed to connect to relay:", relay, e);
      }
    }

    await system.BroadcastEvent(ev);
    console.debug("Unmuted user:", pubkey);
  }, [signer, login.pubkey, system, fetchLatestMuteList, getWriteRelays]);

  // Sync local mutes with fetched mutes
  useEffect(() => {
    if (userMutes.size > 0) {
      setLocalMutes(userMutes);
    }
  }, [userMutes]);

  return {
    /** Current user's muted pubkeys */
    userMutes,
    /** Additional pubkeys' muted pubkeys (e.g., room host) */
    additionalMutes,
    /** Combined mutes from user and additional pubkeys */
    allMutes,
    /** Check if a pubkey is muted by the user */
    isMuted: (pubkey: string) => userMutes.has(pubkey),
    /** Check if a pubkey is muted by user or additional pubkeys */
    isMutedByAny: (pubkey: string) => allMutes.has(pubkey),
    /** Mute a user */
    mute,
    /** Unmute a user */
    unmute,
  };
}
