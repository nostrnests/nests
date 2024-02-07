import { ExternalStore } from "@snort/shared";
import { EventSigner, Nip7Signer, NostrLink } from "@snort/system";
import { useSyncExternalStore } from "react";
import usePresence from "./hooks/usePresence";

type LoginTypes = "none" | "nip7";

export interface LoginData {
  type: LoginTypes;
  pubkey?: string;
}
export interface LoginLoaded {
  signer?: EventSigner;
  handMap: Array<string>;
}
export type LoginSession = LoginData & LoginLoaded;

class LoginStore extends ExternalStore<LoginSession> {
  #session: LoginSession = {
    type: "none",
    handMap: [],
  };

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

  async loadSession() {
    const json = window.localStorage.getItem("session");
    if (json) {
      const session = JSON.parse(json) as LoginSession;
      switch (session.type) {
        case "nip7": {
          session.signer = new Nip7Signer();
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

  takeSnapshot(): LoginSession {
    return { ...this.#session };
  }
}

const LoginSystem = new LoginStore();
LoginSystem.on("change", () => {
  saveSession(LoginSystem.takeSnapshot());
});

export async function loadSession() {
  await LoginSystem.loadSession();
}

export function saveSession(s: LoginSession) {
  window.localStorage.setItem("session", JSON.stringify(s));
}

export function useLogin() {
  return useSyncExternalStore(
    (c) => LoginSystem.hook(c),
    () => LoginSystem.snapshot(),
  );
}

export async function loginWith(type: LoginTypes) {
  switch (type) {
    case "nip7": {
      await LoginSystem.loginWithNip7();
      return;
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
