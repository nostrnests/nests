import { createContext, useContext, useState, useCallback, type PropsWithChildren } from "react";
import type { NostrEvent } from "@nostrify/nostrify";
import { useNavigate } from "react-router-dom";
import { useRoomPresence } from "@/hooks/useRoomPresence";
import { useRoomReactions } from "@/hooks/useRoomReactions";
import { usePresence } from "@/hooks/usePresence";
import { useAdminCommands } from "@/hooks/useAdminCommands";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useLocalParticipant } from "@/transport";
import { getRoomATag } from "@/lib/room";
import { useToast } from "@/hooks/useToast";

interface RoomContextType {
  /** The room event */
  event: NostrEvent;
  /** Room a-tag */
  roomATag: string;
  /** Presence list */
  presenceList: NostrEvent[];
  /** Reactions list */
  reactions: NostrEvent[];
  /** Whether user's hand is raised */
  handRaised: boolean;
  setHandRaised: (v: boolean) => void;
  /** Whether the lobby drawer is open */
  lobbyDrawerOpen: boolean;
  setLobbyDrawerOpen: (v: boolean) => void;
  /** Current user's admin status */
  isHost: boolean;
  isAdmin: boolean;
  isSpeaker: boolean;
  isHostOrAdmin: boolean;
  /** Leave the room */
  leaveRoom: () => void;
}

const RoomContext = createContext<RoomContextType | null>(null);

export function useRoomContext(): RoomContextType {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoomContext must be used within RoomContextProvider");
  return ctx;
}

interface RoomContextProviderProps {
  event: NostrEvent;
}

export function RoomContextProvider({ event, children }: PropsWithChildren<RoomContextProviderProps>) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const roomATag = getRoomATag(event);
  const { isHost, isAdmin, isSpeaker, isHostOrAdmin } = useIsAdmin(event);

  const [handRaised, setHandRaised] = useState(false);
  const [lobbyDrawerOpen, setLobbyDrawerOpen] = useState(false);

  const { data: presenceList = [] } = useRoomPresence(roomATag);
  const { data: reactions = [] } = useRoomReactions(roomATag);

  // Local transport state
  const { isPublishing, isMicEnabled, declinedPublish } = useLocalParticipant();

  // Auto-publish presence
  usePresence({
    roomATag,
    handRaised,
    isPublishing,
    isMuted: !isMicEnabled,
    onStage: isSpeaker,
    declinedPublish,
  });

  const leaveRoom = useCallback(() => {
    navigate("/");
  }, [navigate]);

  // Watch for admin kick commands
  useAdminCommands({
    roomEvent: event,
    onKick: () => {
      toast({ title: "You have been removed from the room", variant: "destructive" });
      leaveRoom();
    },
  });

  return (
    <RoomContext.Provider
      value={{
        event,
        roomATag,
        presenceList,
        reactions,
        handRaised,
        setHandRaised,
        lobbyDrawerOpen,
        setLobbyDrawerOpen,
        isHost,
        isAdmin,
        isSpeaker,
        isHostOrAdmin,
        leaveRoom,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}
