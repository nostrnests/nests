import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useSeoMeta } from "@unhead/react";
import { nip19 } from "nostr-tools";
import { useNostr } from "@nostrify/react";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import type { NostrEvent } from "@nostrify/nostrify";

import { NestTransportProvider } from "@/transport";
import { RoomContextProvider, useRoomContext } from "@/components/RoomContextProvider";
import { ParticipantsGrid } from "@/components/ParticipantsGrid";
import { ChatMessages } from "@/components/ChatMessages";
import { WriteMessage } from "@/components/WriteMessage";
import { MenuBar } from "@/components/MenuBar";
import { RoomLobbyDrawer } from "@/components/RoomLobbyDrawer";

import { Skeleton } from "@/components/ui/skeleton";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useRoomPresence } from "@/hooks/useRoomPresence";
import { useIsMobile } from "@/hooks/useIsMobile";
import { authenticateWithMoqRelay } from "@/transport";
import {
  getRoomTitle,
  getRoomSummary,
  getRoomColor,
  getRoomATag,
  getRoomStreamingUrl,
  getRoomAuthUrl,
  getRoomNamespace,
  getRoomStatus,
  getRoomImage,
} from "@/lib/room";
import { ROOM_KIND, DefaultMoQAuthUrl } from "@/lib/const";
import { themeToCSS } from "@/lib/ditto-theme";
import { cn } from "@/lib/utils";
import type { TransportConfig } from "@/transport";

import NotFound from "./NotFound";

/** Inner room view that has access to transport context */
function RoomInner({ event }: { event: NostrEvent }) {
  return (
    <RoomContextProvider event={event}>
      <RoomContent event={event} />
    </RoomContextProvider>
  );
}

/** Room content — inside RoomContextProvider so it can access roomTheme */
function RoomContent({ event }: { event: NostrEvent }) {
  const { roomTheme, roomATag } = useRoomContext();
  const title = getRoomTitle(event);
  const summary = getRoomSummary(event);
  const color = getRoomColor(event);
  const image = getRoomImage(event);
  const status = getRoomStatus(event);
  const isMobile = useIsMobile();
  const [chatOpen, setChatOpen] = useState(false);
  const [desktopChatExpanded, setDesktopChatExpanded] = useState(true);
  const { data: presenceList } = useRoomPresence(status === "live" ? roomATag : undefined);
  const participantCount = presenceList?.length ?? 0;

  // Convert room theme to CSS custom properties
  const roomThemeCSS = useMemo(
    () => roomTheme ? themeToCSS(roomTheme) : undefined,
    [roomTheme],
  );

  // Load custom font if room theme has one
  useEffect(() => {
    if (!roomTheme?.font?.url) return;
    const id = "room-theme-font";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = roomTheme.font.url;
    document.head.appendChild(link);
    return () => { document.getElementById(id)?.remove(); };
  }, [roomTheme?.font?.url]);

  // Build inline style for the themed root
  const rootStyle = useMemo(() => {
    if (!roomThemeCSS) return undefined;
    const style: Record<string, string> = { ...roomThemeCSS };
    if (roomTheme?.background?.url) {
      style.backgroundImage = `url(${roomTheme.background.url})`;
      style.backgroundSize = roomTheme.background.mode === "tile" ? "auto" : "cover";
      style.backgroundRepeat = roomTheme.background.mode === "tile" ? "repeat" : "no-repeat";
      style.backgroundPosition = "center";
      style.backgroundAttachment = "fixed";
    }
    return style;
  }, [roomThemeCSS, roomTheme?.background]);

  // Header style: use theme primary color instead of gradient when themed
  const headerStyle = useMemo(() => {
    if (!roomTheme) return undefined;
    return { backgroundColor: roomTheme.colors.primary };
  }, [roomTheme]);

  return (
    <div className="flex flex-col h-[100dvh] bg-background" style={rootStyle}>
      {/* Room header / banner */}
      <div
        className={cn("shrink-0 relative overflow-hidden", !roomTheme && color)}
        style={headerStyle}
      >
        {image && (
          <>
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} />
            <div className="absolute inset-0 bg-black/50" />
          </>
        )}
        <div className="relative px-4 py-4 md:px-6 md:py-5">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-white font-bold text-lg md:text-xl leading-tight">{title}</h1>
                {summary && (
                  <p className="text-white/70 text-sm md:text-base mt-1 line-clamp-2">{summary}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {status === "live" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/90 text-white">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </span>
                  )}
                  {participantCount > 0 && (
                    <span className="text-white/60 text-xs md:text-sm flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {participantCount} listening
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Participants panel */}
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-y-auto scrollbar-hide">
            <div className="max-w-3xl mx-auto p-2 md:p-4 pb-24 md:pb-24">
              <div className="bg-background/70 backdrop-blur-sm rounded-xl min-h-[calc(100vh-14rem)]">
                <ParticipantsGrid />
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: menu bar fixed at bottom of participants pane */}
        <div className="hidden md:flex fixed bottom-0 left-0 z-30 pointer-events-none" style={{ width: desktopChatExpanded ? "calc(100% - 24rem)" : "100%" }}>
          <div className="w-full flex justify-center pb-4 pointer-events-auto">
            <MenuBar onChatToggle={() => setDesktopChatExpanded(!desktopChatExpanded)} chatOpen={desktopChatExpanded} />
          </div>
        </div>

        {/* Desktop chat panel - toggled via menu bar chat button */}
        {!isMobile && desktopChatExpanded && (
          <div className="shrink-0 w-80 lg:w-96 p-2 md:p-4 pl-2 md:pl-2">
            <div className="flex flex-col h-full bg-background/80 backdrop-blur-sm rounded-xl border border-border/30 overflow-hidden">
              <div className="px-4 py-2 border-b border-border/30 shrink-0">
                <h3 className="text-sm font-medium text-muted-foreground">Chat</h3>
              </div>
              <ChatMessages roomATag={roomATag} />
              <WriteMessage roomATag={roomATag} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile: menu bar with integrated chat button */}
      {isMobile && (
        <>
          <MenuBar onChatToggle={() => setChatOpen(!chatOpen)} chatOpen={chatOpen} />

          {/* Chat drawer */}
          <Drawer open={chatOpen} onOpenChange={setChatOpen}>
            <DrawerContent className="h-[70dvh] max-h-[70dvh]" style={roomThemeCSS ?? undefined}>
              <DrawerTitle className="sr-only">Chat</DrawerTitle>
              <div className="flex flex-col h-full overflow-hidden">
                <div className="px-4 py-2 border-b border-border shrink-0">
                  <h3 className="text-sm font-medium text-muted-foreground">Chat</h3>
                </div>
                <ChatMessages roomATag={roomATag} />
                <WriteMessage roomATag={roomATag} />
              </div>
            </DrawerContent>
          </Drawer>
        </>
      )}

      {/* Lobby drawer */}
      <RoomLobbyDrawer />
    </div>
  );
}

/** Wrapper that handles transport setup */
function RoomWithTransport({ event }: { event: NostrEvent }) {
  const { user } = useCurrentUser();
  const { isSpeaker } = useIsAdmin(event);
  const [transportConfig, setTransportConfig] = useState<TransportConfig | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const streamingUrl = getRoomStreamingUrl(event);
  const authUrl = getRoomAuthUrl(event) ?? DefaultMoQAuthUrl;
  const namespace = getRoomNamespace(event);
  const certFingerprint = import.meta.env.VITE_MOQ_CERT_FINGERPRINT || undefined;

  // Authenticate with MoQ relay
  useEffect(() => {
    if (!user || !streamingUrl) {
      setTransportConfig(null);
      return;
    }

    let cancelled = false;

    async function authenticate() {
      try {
        const token = await authenticateWithMoqRelay(
          authUrl,
          user!.signer,
          namespace,
          isSpeaker,
        );

        if (cancelled) return;

        setTransportConfig({
          serverUrl: streamingUrl!,
          authUrl,
          roomNamespace: namespace,
          identity: user!.pubkey,
          canPublish: isSpeaker,
          token,
          certFingerprint,
        });
        setAuthError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("MoQ auth failed:", err);
        setAuthError(err instanceof Error ? err.message : "Authentication failed");
        // Still allow joining as listener without audio
        setTransportConfig({
          serverUrl: streamingUrl!,
          authUrl,
          roomNamespace: namespace,
          identity: user!.pubkey,
          canPublish: false,
          certFingerprint,
        });
      }
    }

    authenticate();
    return () => { cancelled = true; };
  }, [user, streamingUrl, authUrl, namespace, isSpeaker]);

  return (
    <NestTransportProvider config={transportConfig} connect={!!user}>
      {authError && (
        <div className="bg-yellow-500/10 text-yellow-500 text-xs px-4 py-1 text-center">
          Audio connection issue: {authError}
        </div>
      )}
      <RoomInner event={event} />
    </NestTransportProvider>
  );
}

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { nostr } = useNostr();

  // Try to get event from navigation state first
  const stateEvent = (location.state as { event?: NostrEvent } | null)?.event;

  // Decode naddr
  const decoded = useMemo(() => {
    if (!id) return null;
    try {
      const result = nip19.decode(id);
      if (result.type === "naddr") return result.data;
    } catch {
      // not a valid naddr
    }
    return null;
  }, [id]);

  // Always fetch the latest event from relays (handles edits/updates)
  const { data: fetchedEvent, isLoading } = useQuery({
    queryKey: ["nostr", "room-event", decoded?.kind, decoded?.pubkey, decoded?.identifier],
    queryFn: async () => {
      if (!decoded) return null;
      const events = await nostr.query(
        [{
          kinds: [decoded.kind],
          authors: [decoded.pubkey],
          "#d": [decoded.identifier],
          limit: 5,
        }],
        { signal: AbortSignal.timeout(5000) },
      );
      // Return the most recent version
      return events.sort((a, b) => b.created_at - a.created_at)[0] ?? null;
    },
    enabled: !!decoded,
    refetchInterval: 5_000, // Refetch every 5s for faster stage promotion visibility
  });

  // Use fetched event if newer than state event, otherwise fall back to state
  const event = useMemo(() => {
    if (!fetchedEvent && !stateEvent) return null;
    if (!fetchedEvent) return stateEvent!;
    if (!stateEvent) return fetchedEvent;
    return fetchedEvent.created_at >= stateEvent.created_at ? fetchedEvent : stateEvent;
  }, [fetchedEvent, stateEvent]);

  useSeoMeta({
    title: event ? `${getRoomTitle(event)} - Nests` : "Room - Nests",
    description: event ? getRoomSummary(event) : "Audio room on Nests",
  });

  if (!decoded && !stateEvent) {
    return <NotFound />;
  }

  if (isLoading && !event) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-48 rounded-lg" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!event) {
    return <NotFound />;
  }

  return <RoomWithTransport event={event} />;
}
