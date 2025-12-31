import { ExternalStore } from "@snort/shared";
import {
  EventBuilder,
  EventKind,
  EventSigner,
  Nip46Signer,
  Nip7Signer,
  NostrLink,
  NostrSystem,
  PrivateKeySigner,
  RelaySettings,
  RequestBuilder,
  parseRelaysFromKind,
} from "@snort/system";
import { useSyncExternalStore } from "react";
import usePresence from "./hooks/usePresence";
import { isMobileDevice } from "./hooks/useIsMobile";

// NIP-46 nostrconnect:// types and utilities
export interface NostrConnectParams {
  clientSecretKey: Uint8Array;
  clientPubkey: string;
  secret: string;
  relays: string[];
}

const DEFAULT_NOSTRCONNECT_RELAY = "wss://relay.primal.net";

export function generateNostrConnectParams(relays?: string[]): NostrConnectParams {
  const clientSecretKey = crypto.getRandomValues(new Uint8Array(32));
  const clientSigner = new PrivateKeySigner(clientSecretKey);
  const clientPubkey = clientSigner.getPubKey();
  const secret = crypto.randomUUID().slice(0, 8);

  return {
    clientSecretKey,
    clientPubkey,
    secret,
    relays: relays && relays.length > 0 ? relays : [DEFAULT_NOSTRCONNECT_RELAY],
  };
}

// NIP-46 permissions needed for the app
const NIP46_PERMISSIONS = [
  "sign_event",
  "nip04_encrypt",
  "nip04_decrypt",
  "nip44_encrypt",
  "nip44_decrypt",
  "get_public_key",
].join(",");

export function generateNostrConnectURI(
  params: NostrConnectParams,
  appName?: string,
  includeCallback?: boolean,
): string {
  const searchParams = new URLSearchParams();

  for (const relay of params.relays) {
    searchParams.append("relay", relay);
  }
  searchParams.set("secret", params.secret);

  if (appName) {
    searchParams.set("name", appName);
  }

  // Request required permissions from the signer
  searchParams.set("perms", NIP46_PERMISSIONS);

  // Add callback URL only when explicitly requested (mobile "Open Signer App" button)
  // Never include callback in QR codes - those are scanned by phones from desktop
  if (includeCallback && typeof window !== "undefined") {
    searchParams.set("callback", `${window.location.origin}/login/callback`);
  }

  return `nostrconnect://${params.clientPubkey}?${searchParams.toString()}`;
}

// NIP-46 response event kind
const NIP46_RESPONSE_KIND = 24133;

/**
 * Wait for a nostrconnect:// response from a remote signer.
 * Returns the bunker pubkey and user pubkey on success.
 */
export async function waitForNostrConnect(
  params: NostrConnectParams,
  signal?: AbortSignal,
): Promise<{ bunkerPubkey: string; userPubkey: string }> {
  const clientSigner = new PrivateKeySigner(params.clientSecretKey);
  const clientPubkey = clientSigner.getPubKey();

  return new Promise((resolve, reject) => {
    const sockets: WebSocket[] = [];
    let resolved = false;
    let bunkerPubkey: string | null = null;
    const pendingRpc = new Map<string, (result: string) => void>();

    const cleanup = () => {
      resolved = true;
      sockets.forEach((ws) => {
        try {
          ws.close();
        } catch {
          // ignore
        }
      });
    };

    // Send an RPC request to the bunker
    const sendRpc = async (ws: WebSocket, method: string, rpcParams: string[] = []): Promise<string> => {
      const id = crypto.randomUUID();
      const payload = { id, method, params: rpcParams };
      const encrypted = await clientSigner.nip44Encrypt(JSON.stringify(payload), bunkerPubkey!);

      // Build and sign the event using EventBuilder
      const eb = new EventBuilder();
      eb.kind(NIP46_RESPONSE_KIND as EventKind)
        .content(encrypted)
        .tag(["p", bunkerPubkey!]);

      const signedEvent = await eb.buildAndSign(clientSigner);
      ws.send(JSON.stringify(["EVENT", signedEvent]));

      return new Promise((resolveRpc) => {
        pendingRpc.set(id, resolveRpc);
      });
    };

    // Handle abort signal
    if (signal) {
      signal.addEventListener("abort", () => {
        cleanup();
        reject(new Error("Connection aborted"));
      });
    }

    // Connect to each relay
    for (const relayUrl of params.relays) {
      try {
        const ws = new WebSocket(relayUrl);
        sockets.push(ws);

        ws.onopen = () => {
          // Subscribe to NIP-46 response events tagged to our client pubkey
          const subId = `nostrconnect-${params.secret}`;
          const req = JSON.stringify([
            "REQ",
            subId,
            {
              kinds: [NIP46_RESPONSE_KIND],
              "#p": [clientPubkey],
              limit: 10,
            },
          ]);
          ws.send(req);
        };

        ws.onmessage = async (e) => {
          if (resolved) return;

          try {
            const msg = JSON.parse(e.data);
            if (msg[0] !== "EVENT") return;

            const event = msg[2];
            if (event.kind !== NIP46_RESPONSE_KIND) return;

            // Decrypt the content using NIP-44
            let decrypted: string;
            try {
              decrypted = await clientSigner.nip44Decrypt(event.content, event.pubkey);
            } catch {
              // Try NIP-04 as fallback
              try {
                decrypted = await clientSigner.nip4Decrypt(event.content, event.pubkey);
              } catch {
                return; // Can't decrypt, not for us
              }
            }

            const message = JSON.parse(decrypted);

            // Check if this is a response to a pending RPC
            if ("id" in message && "result" in message && pendingRpc.has(message.id)) {
              const callback = pendingRpc.get(message.id)!;
              pendingRpc.delete(message.id);
              callback(message.result);
              return;
            }

            // Check if this is a connect request from the remote signer
            // Format: { id, method: "connect", params: [userPubkey, secret, perms] }
            if ("method" in message && message.method === "connect") {
              const userPubkey = message.params[0];
              const receivedSecret = message.params[1];

              // Validate the secret matches
              if (receivedSecret === params.secret) {
                cleanup();
                resolve({
                  bunkerPubkey: event.pubkey,
                  userPubkey,
                });
              }
            }
            // Handle response format (result field) - need to get pubkey via RPC
            else if ("result" in message && (message.result === params.secret || message.result === "ack")) {
              bunkerPubkey = event.pubkey;

              // Now we need to get the actual user pubkey via get_public_key RPC
              try {
                const userPubkey = await sendRpc(ws, "get_public_key");
                cleanup();
                resolve({
                  bunkerPubkey: event.pubkey,
                  userPubkey,
                });
              } catch {
                cleanup();
                reject(new Error("Failed to get user pubkey from signer"));
              }
            }
          } catch {
            // Failed to process message
          }
        };

        ws.onerror = () => {
          // Connection error, try other relays
        };

        ws.onclose = () => {
          // Remove from active sockets
          const idx = sockets.indexOf(ws);
          if (idx >= 0) sockets.splice(idx, 1);

          // If all sockets closed without resolution, reject
          if (!resolved && sockets.length === 0) {
            reject(new Error("All relay connections closed"));
          }
        };
      } catch {
        // Failed to connect to this relay
      }
    }
  });
}

type LoginTypes = "none" | "nip7" | "nip46" | "nsec";
export type SupportedLocales = "en-US";

export interface LoginData {
  type: LoginTypes;
  pubkey?: string;
  locale?: SupportedLocales;
  privateKey?: string;
  signerRelay?: Array<string>;
}
export interface LoginLoaded {
  update?: (fn: (s: LoginSession) => void) => void;
  signer?: EventSigner;
  handMap?: Array<string>;
  follows?: Array<[string, string]>;
  relays?: Record<string, RelaySettings>;
  lobbyType: "all" | "following";
}
export type LoginSession = LoginData & LoginLoaded;

class LoginStore extends ExternalStore<LoginSession> {
  #session: LoginSession = LoginStore.#defaultSession();

  constructor() {
    super();
    this.loadSession();
  }

  async loginWithPrivateKey(key: string | Uint8Array) {
    if (this.#session.type !== "none") {
      throw new Error("Already logged in ");
    }
    const signer = new PrivateKeySigner(key);
    this.#session.signer = signer;
    this.#session.type = "nsec";
    this.#session.privateKey = signer.privateKey;
    const pk = signer.getPubKey();
    this.#session.pubkey = pk;
    this.notifyChange();
  }

  async loginWithNip7() {
    if (this.#session.type !== "none") {
      throw new Error("Already logged in ");
    }
    this.#session.type = "nip7";
    this.#session.signer = new Nip7Signer();
    const pk = await this.#session.signer.getPubKey();
    this.#session.pubkey = pk;
    this.notifyChange();
  }

  async loginWithNip46(signer: Nip46Signer) {
    if (this.#session.type !== "none") {
      throw new Error("Already logged in ");
    }
    this.#session.type = "nip46";
    this.#session.signer = signer;
    this.#session.privateKey = signer.privateKey;
    this.#session.signerRelay = signer.relays;
    const pk = await this.#session.signer.getPubKey();
    this.#session.pubkey = pk;
    this.notifyChange();
  }

  async loginWithNostrConnect(params: NostrConnectParams, signal?: AbortSignal) {
    if (this.#session.type !== "none") {
      throw new Error("Already logged in");
    }

    // Wait for the remote signer to connect and get the user's pubkey
    const { userPubkey } = await waitForNostrConnect(params, signal);

    // Create the bunker URL with the user's pubkey and permissions for proper session handling
    // The bunker:// URL format expects the user's pubkey, not the bunker's pubkey
    const relayParams = params.relays.map((r) => `relay=${encodeURIComponent(r)}`).join("&");
    const bunkerUrl = `bunker://${userPubkey}?${relayParams}&perms=${encodeURIComponent(NIP46_PERMISSIONS)}`;

    // Create the Nip46Signer with our client key
    const clientSigner = new PrivateKeySigner(params.clientSecretKey);
    const signer = new Nip46Signer(bunkerUrl, clientSigner);
    // Don't await init() - the handshake was already done in waitForNostrConnect
    // This matches how loadSession handles NIP-46 (line 335)
    signer.init();

    // Login with the signer
    await this.loginWithNip46(signer);
  }

  loadSession() {
    const json = window.localStorage.getItem("session");
    if (json) {
      const session = JSON.parse(json) as LoginSession;
      switch (session.type) {
        case "nip7": {
          session.signer = new Nip7Signer();
          break;
        }
        case "nip46": {
          const relayParams = session.signerRelay?.map((a) => `relay=${encodeURIComponent(a)}`).join("&") ?? "";
          const url = `bunker://${session.pubkey!}?${relayParams}&perms=${encodeURIComponent(NIP46_PERMISSIONS)}`;
          session.signer = new Nip46Signer(url, new PrivateKeySigner(session.privateKey!));
          session.signer.init();
          break;
        }
        case "nsec": {
          session.signer = new PrivateKeySigner(session.privateKey!);
        }
      }
      this.#session = session;
    }
  }

  toggleHand(link: NostrLink) {
    this.#session.handMap ??= [];
    if (this.#session.handMap.includes(link.id)) {
      this.#session.handMap = this.#session.handMap.filter((a) => a !== link.id);
      this.notifyChange();
      return false;
    } else {
      this.#session.handMap.push(link.id);
      this.notifyChange();
      return true;
    }
  }

  updateSession(fn: (s: LoginSession) => void) {
    fn(this.#session);
    this.notifyChange();
  }

  static #defaultSession(): LoginSession {
    return {
      type: "none",
      lobbyType: "all",
    };
  }

  logout() {
    this.#session = LoginStore.#defaultSession();
    this.notifyChange();
  }

  takeSnapshot(): LoginSession {
    const clone = { ...this.#session };
    clone.update = (fn) => {
      this.updateSession(fn);
    };
    return clone;
  }
}

const LoginSystem = new LoginStore();
LoginSystem.on("change", () => {
  const ret = LoginSystem.takeSnapshot();
  delete ret["signer"];
  saveSession(ret);
});

export function saveSession(s: LoginSession) {
  window.localStorage.setItem("session", JSON.stringify(s));
}

export function useLogin() {
  return useSyncExternalStore(
    (c) => LoginSystem.hook(c),
    () => LoginSystem.snapshot(),
  );
}

export async function loginWith(type: LoginTypes, data?: Nip46Signer | string | Uint8Array) {
  switch (type) {
    case "nip7": {
      await LoginSystem.loginWithNip7();
      break;
    }
    case "nip46": {
      await LoginSystem.loginWithNip46(data as Nip46Signer);
      break;
    }
    case "nsec": {
      await LoginSystem.loginWithPrivateKey(data as string | Uint8Array);
    }
  }
}

export function useHand(link: NostrLink) {
  const presence = usePresence(link);
  return {
    toggleHand: async () => {
      LoginSystem.toggleHand(link);
    },
    active: presence.hand,
  };
}

export function logout() {
  LoginSystem.logout();
}

export async function loginWithNostrConnect(params: NostrConnectParams, signal?: AbortSignal) {
  return LoginSystem.loginWithNostrConnect(params, signal);
}

let lastPubkey: string | undefined;
/// Update login session with follows/relays
export function loginHook(system: NostrSystem) {
  const loadSessionData = async () => {
    const session = LoginSystem.snapshot();
    if (lastPubkey === session.pubkey) return;
    lastPubkey = session.pubkey;

    if (session.pubkey) {
      system.config.socialGraphInstance.setRoot(session.pubkey);
      const rb = new RequestBuilder(`login:${session.pubkey.slice(0, 12)}`);
      rb.withFilter().authors([session.pubkey]).kinds([EventKind.ContactList, EventKind.Relays]);

      const evs = await system.Fetch(rb);
      if (evs.length > 0) {
        const fromEvent = evs.reduce((acc, v) => (acc.created_at > v.created_at ? acc : v), evs[0]);
        const relays = parseRelaysFromKind(fromEvent);
        LoginSystem.updateSession((s) => {
          s.follows = fromEvent.tags.filter((a) => a[0] === "p") as Array<[string, string]>;
          s.relays = relays ? Object.fromEntries(relays?.map((a) => [a.url, a.settings])) : undefined;
        });
      }
    }
  };

  LoginSystem.on("change", () => {
    loadSessionData().catch(console.error);
  });
  loadSessionData().catch(console.error);
  return LoginSystem.snapshot();
}
