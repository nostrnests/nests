import { useState, useCallback, useEffect, useMemo, useRef, type PropsWithChildren } from "react";
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
import { type DittoTheme } from "@/lib/ditto-theme";
import { RoomContext, type RecentReaction } from "@/contexts/RoomContext";

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

  // Track recent reactions for animations.
  // Seen IDs are kept with the time we saw them so stale entries can be pruned.
  const [recentReactions, setRecentReactions] = useState<RecentReaction[]>([]);
  const seenReactionIdsRef = useRef<Map<string, number>>(new Map());

  // Watch for new reactions and add them to recentReactions
  useEffect(() => {
    const now = Math.floor(Date.now() / 1000);
    const newReactions: RecentReaction[] = [];

    for (const r of reactions) {
      // Accept reactions from the last 30 seconds (accounts for query polling delay)
      if (r.kind === 7 && r.content && (now - r.created_at) < 30 && !seenReactionIdsRef.current.has(r.id)) {
        seenReactionIdsRef.current.set(r.id, now);
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
      const now = Math.floor(Date.now() / 1000);
      const cutoff = now - 5;
      // Keep the same array identity when nothing expired to avoid re-renders
      setRecentReactions((prev) => {
        const next = prev.filter((r) => r.timestamp > cutoff);
        return next.length === prev.length ? prev : next;
      });
      // Prune seen IDs past the 30s dedupe window so the map doesn't grow
      // unbounded during long sessions
      for (const [id, seenAt] of seenReactionIdsRef.current) {
        if (now - seenAt > 60) seenReactionIdsRef.current.delete(id);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Build participant reactions map (most recent reaction per pubkey).
  // recentReactions is already pruned to the last 5s by the interval above.
  const participantReactions = useMemo(() => {
    const map = new Map<string, { emoji: string; emojiUrl?: string }>();
    for (const r of recentReactions) {
      map.set(r.pubkey, { emoji: r.emoji, emojiUrl: r.emojiUrl });
    }
    return map;
  }, [recentReactions]);

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
    seenReactionIdsRef.current.set(fakeId, now);
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

  const contextValue = useMemo(
    () => ({
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
    }),
    [
      event,
      roomATag,
      presenceList,
      reactions,
      recentReactions,
      participantReactions,
      handRaised,
      lobbyDrawerOpen,
      isHost,
      isAdmin,
      isSpeaker,
      isHostOrAdmin,
      leaveRoom,
      addLocalReaction,
      roomTheme,
    ],
  );

  return (
    <RoomContext.Provider value={contextValue}>
      {children}
    </RoomContext.Provider>
  );
}
