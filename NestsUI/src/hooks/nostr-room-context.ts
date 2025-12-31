import { NostrEvent, TaggedNostrEvent } from "@snort/system";
import { ReactNode, createContext, useContext } from "react";
import { NestsApi, RoomInfo } from "../api";
import { ApiUrl } from "../const";

export interface RoomState {
  event: NostrEvent;
  reactions: Array<NostrEvent>;
  presence: Array<TaggedNostrEvent>;
  flyout?: ReactNode;
  info?: RoomInfo;
  setFlyout: (n?: ReactNode) => void;
  lobbyOpen: boolean;
  setLobbyOpen: (open: boolean) => void;
  volume: number;
  setVolume: (n: number) => void;
  api: NestsApi;
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
  api: new NestsApi(ApiUrl),
});

export function useNostrRoom() {
  return useContext(NostrRoomContext);
}
