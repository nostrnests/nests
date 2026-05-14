import { createContext } from "react";

/**
 * Context value for the active room's effective relay set.
 *
 * `null` means we are not inside a room — consumers should fall back to the
 * global Nostr pool (NIP-65 / app defaults).
 *
 * When non-null, the array is already normalized and deduped, and represents
 * the union of the user's NIP-65 relays and the relays advertised by the
 * room event (`relays` tag + naddr relay hints).
 */
export const RoomRelaysContext = createContext<string[] | null>(null);
