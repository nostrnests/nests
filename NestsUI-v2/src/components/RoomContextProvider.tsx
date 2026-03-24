import { createContext, useContext, useState, useCallback, useEffect, useRef, type PropsWithChildren } from "react";
import type { NostrEvent } from "@nostrify/nostrify";
import { useNavigate } from "react-router-dom";
import { useRoomPresence } from "@/hooks/useRoomPresence";
import { useRoomReactions } from "@/hooks/useRoomReactions";
import { usePresence } from "@/hooks/usePresence";
import { useAdminCommands } from "@/hooks/useAdminCommands";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useLocalParticipant } from "@/transport";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRoomTheme } from "@/hooks/useRoomTheme";
import { getRoomATag } from "@/lib/room";
import { useToast } from "@/hooks/useToast";
import { themeToCSS, type DittoTheme } from "@/lib/ditto-theme";

export interface RecentReaction {
  id: string;
  pubkey: string;
  emoji: string;
  /** URL for custom emoji images (NIP-30) */
  emojiUrl?: string;
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
  /** Map of pubkey -> most recent reaction (emoji text + optional image URL) */
  participantReactions: Map<string, { emoji: string; emojiUrl?: string }>;
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
  /** Optimistically add a local reaction for immediate display */
  addLocalReaction: (emoji: string, emojiUrl?: string) => void;
  /** Room's Ditto theme (if any) */
  roomTheme: DittoTheme | null;
}

const RoomContext = createContext<RoomContextType | null>(null);

export function useRoomContext(): RoomContextType {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoomContext must be used within RoomContextProvider");
  return ctx;
}

/** Safe hook for portalled components (drawers/dialogs) that may or may not be inside room context. */
export function useOptionalRoomThemeCSS(): Record<string, string> | undefined {
  const ctx = useContext(RoomContext);
  if (!ctx?.roomTheme) return undefined;
  return themeToCSS(ctx.roomTheme);
}

interface RoomContextProviderProps {
  event: NostrEvent;
}

export function RoomContextProvider({ event, children }: PropsWithChildren<RoomContextProviderProps>) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const roomATag = getRoomATag(event);
  const { isHost, isAdmin, isSpeaker, isHostOrAdmin } = useIsAdmin(event);

  const [handRaised, setHandRaised] = useState(false);
  const [lobbyDrawerOpen, setLobbyDrawerOpen] = useState(false);

  const { data: presenceList = [] } = useRoomPresence(roomATag);
  const { data: reactions = [] } = useRoomReactions(roomATag);
  const { data: rawRoomTheme = null } = useRoomTheme(event);
  // Persist last non-null theme to prevent flash during refetches
  const lastThemeRef = useRef<DittoTheme | null>(null);
  if (rawRoomTheme) lastThemeRef.current = rawRoomTheme;
  const roomTheme = rawRoomTheme ?? lastThemeRef.current;

  // Track recent reactions for animations
  const [recentReactions, setRecentReactions] = useState<RecentReaction[]>([]);
  const seenReactionIdsRef = useRef<Set<string>>(new Set());

  // Watch for new reactions and add them to recentReactions
  useEffect(() => {
    const now = Math.floor(Date.now() / 1000);
    const newReactions: RecentReaction[] = [];

    for (const r of reactions) {
      // Accept reactions from the last 30 seconds (accounts for query polling delay)
      if (r.kind === 7 && r.content && (now - r.created_at) < 30 && !seenReactionIdsRef.current.has(r.id)) {
        seenReactionIdsRef.current.add(r.id);
        // Check for custom emoji URL (NIP-30)
        const emojiTag = r.tags.find(([t]) => t === "emoji");
        const emojiUrl = emojiTag?.[2]; // ["emoji", "shortcode", "url"]
        newReactions.push({
          id: r.id,
          pubkey: r.pubkey,
          emoji: r.content,
          emojiUrl,
          timestamp: now,
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
    const map = new Map<string, { emoji: string; emojiUrl?: string }>();
    const now = Math.floor(Date.now() / 1000);
    // recentReactions are already filtered to recent; pick last per pubkey
    for (const r of recentReactions) {
      if (now - r.timestamp < 5) {
        map.set(r.pubkey, { emoji: r.emoji, emojiUrl: r.emojiUrl });
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
    onStage: isSpeaker && !declinedPublish,
    declinedPublish,
  });

  const leaveRoom = useCallback(() => {
    navigate("/lobby");
  }, [navigate]);

  // Optimistically add a local reaction so it shows immediately without waiting for relay round-trip
  const addLocalReaction = useCallback((emoji: string, emojiUrl?: string) => {
    if (!user) return;
    const now = Math.floor(Date.now() / 1000);
    const fakeId = `local-${now}-${Math.random().toString(36).slice(2, 8)}`;
    seenReactionIdsRef.current.add(fakeId);
    setRecentReactions((prev) => [
      ...prev,
      { id: fakeId, pubkey: user.pubkey, emoji, emojiUrl, timestamp: now },
    ]);
  }, [user]);

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
        addLocalReaction,
        roomTheme,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}
