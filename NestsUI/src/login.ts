import { ExternalStore } from "@snort/shared";
import { EventKind, EventSigner, Nip46Signer, Nip7Signer, NostrLink, NostrSystem, PrivateKeySigner, RelaySettings, RequestBuilder, parseRelaysFromKind } from "@snort/system";
import { useSyncExternalStore } from "react";
import usePresence from "./hooks/usePresence";

type LoginTypes = "none" | "nip7" | "nip46";
export type SupportedLocales = "en-US";

export interface LoginData {
  type: LoginTypes;
  pubkey?: string;
  locale?: SupportedLocales;
  privateKey?: string;
  signerRelay?: Array<string>;
}
export interface LoginLoaded {
  signer?: EventSigner;
  handMap: Array<string>;
  follows: Array<[string, string]>;
  relays: Record<string, RelaySettings>;
}
export type LoginSession = LoginData & LoginLoaded;

class LoginStore extends ExternalStore<LoginSession> {
  #session: LoginSession = LoginStore.#defaultSession();

  constructor() {
    super();
    this.loadSession();
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
          const url = `bunker://${session.pubkey!}?${session.signerRelay?.map((a) => `relay=${encodeURIComponent(a)}`).join("&")}`;
          session.signer = new Nip46Signer(url, new PrivateKeySigner(session.privateKey!));
          session.signer.init();
          break;
        }
      }
      this.#session = session;
    }
  }

  toggleHand(link: NostrLink) {
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

  static #defaultSession() {
    return {
      type: "none",
      handMap: [],
      follows: [],
      relays: {},
    } as LoginSession;
  }

  logout() {
    this.#session = LoginStore.#defaultSession();
    this.notifyChange();
  }

  takeSnapshot(): LoginSession {
    return { ...this.#session };
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

export async function loginWith(type: LoginTypes, data?: Nip46Signer) {
  switch (type) {
    case "nip7": {
      await LoginSystem.loginWithNip7();
      break;
    }
    case "nip46": {
      await LoginSystem.loginWithNip46(data!);
      break;
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

let lastPubkey: string | undefined;
/// Update login session with follows/relays
export function loginHook(system: NostrSystem) {
  const loadSessionData = async () => {
    const session = LoginSystem.snapshot();
    if (lastPubkey === session.pubkey) return;
    lastPubkey = session.pubkey;
    if (session.pubkey) {
      const rb = new RequestBuilder(`login:${session.pubkey.slice(0, 12)}`);
      rb.withFilter().authors([session.pubkey]).kinds([EventKind.ContactList, EventKind.Relays]);

      const evs = await system.Fetch(rb);
      if (evs.length > 0) {
        const fromEvent = evs.reduce((acc, v) => (acc.created_at > v.created_at ? acc : v), evs[0]);
        const relays = parseRelaysFromKind(fromEvent);
        LoginSystem.updateSession(s => {
          s.follows = fromEvent.tags.filter(a => a[0] === "p") as Array<[string, string]>;
          s.relays = relays ? Object.fromEntries(relays?.map(a => [a.url, a.settings])) : {};
        });
      }
    }
  }

  LoginSystem.on("change", () => {
    loadSessionData().catch(console.error);
  });
  loadSessionData().catch(console.error);
}