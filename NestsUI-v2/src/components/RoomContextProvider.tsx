import { createContext, useContext, useState, useCallback, useEffect, useRef, type PropsWithChildren } from "react";
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

export interface RecentReaction {
  id: string;
  pubkey: string;
  emoji: string;
  timestamp: number;
}

interface RoomContextType {
  /** The room event */
  event: NostrEvent;
  /** Room a-tag */
  roomATag: string;
  /** Presence list */
  presenceList: NostrEvent[];
  /** Reactions list */
  reactions: NostrEvent[];
  /** Recent reactions (within last 5s) for overlay animations */
  recentReactions: RecentReaction[];
  /** Map of pubkey -> most recent reaction emoji (within 5s) */
  participantReactions: Map<string, string>;
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

  // Track recent reactions for animations
  const [recentReactions, setRecentReactions] = useState<RecentReaction[]>([]);
  const seenReactionIdsRef = useRef<Set<string>>(new Set());

  // Watch for new reactions and add them to recentReactions
  useEffect(() => {
    const now = Math.floor(Date.now() / 1000);
    const newReactions: RecentReaction[] = [];

    for (const r of reactions) {
      // Only consider reactions from the last 10 seconds that we haven't seen yet
      if (r.kind === 7 && r.content && (now - r.created_at) < 10 && !seenReactionIdsRef.current.has(r.id)) {
        seenReactionIdsRef.current.add(r.id);
        newReactions.push({
          id: r.id,
          pubkey: r.pubkey,
          emoji: r.content,
          timestamp: r.created_at,
        });
      }
    }

    if (newReactions.length > 0) {
      setRecentReactions((prev) => [...prev, ...newReactions]);
    }
  }, [reactions]);

  // Clean up old reactions (older than 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Math.floor(Date.now() / 1000) - 5;
      setRecentReactions((prev) => prev.filter((r) => r.timestamp > cutoff));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Build participant reactions map (most recent reaction within last 5s per pubkey)
  const participantReactions = (() => {
    const map = new Map<string, string>();
    const now = Math.floor(Date.now() / 1000);
    // recentReactions are already filtered to recent; pick last per pubkey
    for (const r of recentReactions) {
      if (now - r.timestamp < 5) {
        map.set(r.pubkey, r.emoji);
      }
    }
    return map;
  })();

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
        recentReactions,
        participantReactions,
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
