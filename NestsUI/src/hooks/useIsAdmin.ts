import { useContext } from "react";
import { useLogin } from "../login";
import { NostrRoomContext } from "./nostr-room-context";

export function useIsAdmin() {
  const login = useLogin();
  const nostrRoom = useContext(NostrRoomContext);
  return login.pubkey && nostrRoom.info?.admins.includes(login.pubkey);
}
