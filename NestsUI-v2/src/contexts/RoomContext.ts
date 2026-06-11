import { createContext, useContext } from "react";
import type { NostrEvent } from "@nostrify/nostrify";
import { themeToCSS, type DittoTheme } from "@/lib/ditto-theme";

export interface RecentReaction {
  id: string;
  pubkey: string;
  emoji: string;
  /** URL for custom emoji images (NIP-30) */
  emojiUrl?: string;
  timestamp: number;
}

export interface RoomContextType {
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

export const RoomContext = createContext<RoomContextType | null>(null);

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
