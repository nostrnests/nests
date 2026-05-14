import { useContext } from "react";
import { RoomRelaysContext } from "@/contexts/RoomRelaysContext";

/**
 * Returns the active room's effective relay list, or `null` when not inside
 * a `RoomRelaysProvider`. The returned array is stable across renders for
 * identical relay sets.
 */
export function useRoomRelays(): string[] | null {
  return useContext(RoomRelaysContext);
}
