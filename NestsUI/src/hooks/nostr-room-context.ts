import { NostrEvent, TaggedNostrEvent } from "@snort/system";
import { ReactNode, createContext, useContext } from "react";
import { RoomInfo } from "../api";

export interface RoomState {
  event: NostrEvent;
  reactions: Array<NostrEvent>;
  presence: Array<TaggedNostrEvent>;
  flyout?: ReactNode;
  info?: RoomInfo;
  setFlyout: (n?: ReactNode) => void;
  volume: number;
  setVolume: (n: number) => void;
}

export const NostrRoomContext = createContext<RoomState>({
  event: {} as NostrEvent,
  reactions: [],
  presence: [],
  setFlyout: () => {},
  setVolume: () => {},
  volume: 1.0,
});

export function useNostrRoom() {
  return useContext(NostrRoomContext);
}
