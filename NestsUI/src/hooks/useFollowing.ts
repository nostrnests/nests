import { useLogin } from "../login";
import { EventKind, EventPublisher, RequestBuilder } from "@snort/system";
import useEventBuilder from "./useEventBuilder";
import { DefaultRelays } from "../const";

// Indexer relays that aggregate NIP-65 relay lists and contact lists
const IndexerRelays = [
  "wss://purplepag.es",
  "wss://user.kindpag.es",
  "wss://relay.nos.social",
];

export default function useFollowing() {
  const login = useLogin();
  const { system, signer } = useEventBuilder();

  // Get user's write relays from their relay list (kind 10002)
  const getWriteRelays = (): string[] => {
    const writeRelays: string[] = [];
    if (login.relays) {
      for (const [url, settings] of Object.entries(login.relays)) {
        if (settings.write) {
          writeRelays.push(url);
        }
      }
    }
    // Fallback to default relays if no write relays configured
    return writeRelays.length > 0 ? writeRelays : DefaultRelays;
  };

  // Fetch the latest contact list from relays before making changes
  const fetchLatestContactList = async (): Promise<Array<[string, string]> | undefined> => {
    if (!login.pubkey) return undefined;

    const writeRelays = getWriteRelays();

    // Connect to indexer relays first - they aggregate contact lists
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
        console.debug("Failed to connect to relay for contact list fetch:", relay, e);
      }
    }

    try {
      const rb = new RequestBuilder(`contact-list:${login.pubkey.slice(0, 12)}`);
      rb.withFilter().authors([login.pubkey]).kinds([EventKind.ContactList]).limit(1);

      const events = await system.Fetch(rb);
      if (events.length > 0) {
        // Get the most recent contact list
        const latest = events.reduce((acc, v) => (acc.created_at > v.created_at ? acc : v), events[0]);
        console.debug("Fetched latest contact list with", latest.tags.filter((a) => a[0] === "p").length, "follows");
        return latest.tags.filter((a) => a[0] === "p") as Array<[string, string]>;
      }
    } catch (e) {
      console.error("Failed to fetch latest contact list:", e);
    }

    return undefined;
  };

  const updateFollows = async (f: Array<[string, string]>) => {
    if (!signer || !login.pubkey) return;
    const pub = new EventPublisher(signer, login.pubkey);
    return await pub.contactList(f, login.relays);
  };

  // Broadcast to user's write relays
  const broadcastToWriteRelays = async (ev: Awaited<ReturnType<typeof updateFollows>>) => {
    if (!ev) return;

    const writeRelays = getWriteRelays();

    // Ensure we're connected to user's write relays
    for (const relay of writeRelays) {
      try {
        await system.ConnectToRelay(relay, { read: true, write: true });
      } catch (e) {
        console.debug("Failed to connect to relay for broadcast:", relay, e);
      }
    }

    // Broadcast the event to all connected relays with write permission
    // Note: Indexers like purplepag.es only accept NIP-65 events, not contact lists
    await system.BroadcastEvent(ev);
    console.debug("Broadcasted contact list to user relays:", writeRelays);
  };

  return {
    follows: login.follows,
    isFollowing: (pk: string) => {
      return login.follows?.some((a) => a[0] === "p" && a[1] === pk) ?? false;
    },
    follow: async (pk: string) => {
      // Fetch latest contact list to avoid overwriting changes from other clients
      const latestFollows = await fetchLatestContactList();
      const baseFollows = latestFollows ?? login.follows ?? [];

      // Check if already following
      if (baseFollows.some((a) => a[0] === "p" && a[1] === pk)) {
        console.debug("Already following", pk);
        return;
      }

      const newList = [...baseFollows, ["p", pk]] as Array<[string, string]>;
      const ev = await updateFollows(newList);
      if (ev) {
        await broadcastToWriteRelays(ev);
      }
      login.update?.((s) => {
        s.follows = newList;
      });
    },
    unfollow: async (pk: string) => {
      // Fetch latest contact list to avoid overwriting changes from other clients
      const latestFollows = await fetchLatestContactList();
      const baseFollows = latestFollows ?? login.follows ?? [];

      const newList = [...baseFollows.filter((a) => a[1] !== pk)] as Array<[string, string]>;
      const ev = await updateFollows(newList);
      if (ev) {
        await broadcastToWriteRelays(ev);
      }
      login.update?.((s) => {
        s.follows = newList;
      });
    },
  };
}
