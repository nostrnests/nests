import { createContext } from "react";

export interface LoginSession {
  pubkey?: string;
}

export const Login = createContext({} as LoginSession);

export function loadSession() {
  const session = window.localStorage.getItem("session");
  if (session) {
    return JSON.parse(session) as LoginSession;
  }
}

export function saveSession(s: LoginSession) {
  window.localStorage.setItem("session", JSON.stringify(s));
}
