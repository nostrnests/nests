import { useLogin } from "../login";
import { useNostrRoom } from "./nostr-room-context";

export function useIsAdmin() {
  const login = useLogin();
  const nostrRoom = useNostrRoom();
  return login.pubkey && nostrRoom.info?.admins.includes(login.pubkey);
}
