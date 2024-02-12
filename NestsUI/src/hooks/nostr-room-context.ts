import { NostrEvent, TaggedNostrEvent } from "@snort/system";
import { ReactNode, createContext } from "react";
import { RoomInfo } from "../api";

export interface RoomState {
  reactions: Array<NostrEvent>;
  presence: Array<TaggedNostrEvent>;
  flyout?: ReactNode;
  info?: RoomInfo;
  setFlyout: (n?: ReactNode) => void;
}

export const NostrRoomContext = createContext<RoomState>({
  reactions: [],
  presence: [],
  setFlyout: () => {},
});
