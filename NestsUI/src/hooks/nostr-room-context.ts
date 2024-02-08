import { NostrEvent, TaggedNostrEvent } from "@snort/system";
import { ReactNode, createContext } from "react";

export interface RoomState {
  reactions: Array<NostrEvent>;
  presence: Array<TaggedNostrEvent>;
  flyout?: ReactNode;
  setFlyout: (n?: ReactNode) => void;
}

export const NostrRoomContext = createContext<RoomState>({
  reactions: [],
  presence: [],
  setFlyout: () => {},
});
