import { useLogin } from "../login";
import { ParticipantRole } from "../const";
import { useNostrRoom } from "./nostr-room-context";

/**
 * Check if the current logged-in user is a host or admin of the current room.
 * Determined by the room event's author (host) or p-tags with admin role.
 */
export function useIsAdmin() {
  const login = useLogin();
  const nostrRoom = useNostrRoom();
  const event = nostrRoom.event;

  if (!login.pubkey || !event) return false;

  // Host is always admin
  if (event.pubkey === login.pubkey) return true;

  // Check p-tags for admin role
  return event.tags.some(
    (t) => t[0] === "p" && t[1] === login.pubkey && t[3] === ParticipantRole.ADMIN,
  );
}
