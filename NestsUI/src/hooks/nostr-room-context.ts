import { NostrEvent, TaggedNostrEvent } from "@snort/system";
import { ReactNode, createContext, useContext } from "react";

export interface RoomState {
  event: NostrEvent;
  reactions: Array<NostrEvent>;
  presence: Array<TaggedNostrEvent>;
  flyout?: ReactNode;
  setFlyout: (n?: ReactNode) => void;
  lobbyOpen: boolean;
  setLobbyOpen: (open: boolean) => void;
  volume: number;
  setVolume: (n: number) => void;
  leaveRoom: () => void;
}

export const NostrRoomContext = createContext<RoomState>({
  event: {} as NostrEvent,
  reactions: [],
  presence: [],
  setFlyout: () => {},
  lobbyOpen: false,
  setLobbyOpen: () => {},
  setVolume: () => {},
  volume: 1.0,
  leaveRoom: () => {},
});

export function useNostrRoom() {
  return useContext(NostrRoomContext);
}
