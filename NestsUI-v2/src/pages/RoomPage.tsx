import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useSeoMeta } from "@unhead/react";
import { nip19 } from "nostr-tools";
import { useNostr } from "@nostrify/react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, PanelRightClose, PanelRightOpen, Users } from "lucide-react";
import type { NostrEvent } from "@nostrify/nostrify";

import { NestTransportProvider } from "@/transport";
import { RoomContextProvider } from "@/components/RoomContextProvider";
import { ParticipantsGrid } from "@/components/ParticipantsGrid";
import { ChatMessages } from "@/components/ChatMessages";
import { WriteMessage } from "@/components/WriteMessage";
import { MenuBar } from "@/components/MenuBar";
import { RoomLobbyDrawer } from "@/components/RoomLobbyDrawer";
import { ReactionOverlay } from "@/components/ReactionOverlay";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { cn } from "@/lib/utils";
import type { TransportConfig } from "@/transport";

import NotFound from "./NotFound";

/** Inner room view that has access to transport context */
function RoomInner({ event }: { event: NostrEvent }) {
  const roomATag = getRoomATag(event);
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

  return (
    <RoomContextProvider event={event}>
      <div className="flex flex-col h-[100dvh] bg-background">
        {/* Room header / banner */}
        <div className={cn("shrink-0 relative overflow-hidden", color)}>
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
          <div className="flex-1 overflow-y-auto pb-32 md:pb-20 relative">
            <div className="max-w-3xl mx-auto">
              <ParticipantsGrid />
            </div>
          </div>

          {/* Desktop: menu bar fixed at bottom of participants pane */}
          <div className="hidden md:flex fixed bottom-0 left-0 z-30 pointer-events-none" style={{ width: desktopChatExpanded ? "calc(100% - 24rem)" : "calc(100% - 3rem)" }}>
            <div className="w-full flex justify-center pb-4 pointer-events-auto">
              <MenuBar />
            </div>
          </div>

          {/* Desktop chat panel - collapsible */}
          {!isMobile && (
            <div
              className={cn(
                "border-l border-border flex flex-col shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden",
                desktopChatExpanded ? "w-80 lg:w-96" : "w-12",
              )}
            >
              {desktopChatExpanded ? (
                <>
                  <div className="px-4 py-2 border-b border-border shrink-0 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">Chat</h3>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full"
                          onClick={() => setDesktopChatExpanded(false)}
                        >
                          <PanelRightClose className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">Collapse chat</TooltipContent>
                    </Tooltip>
                  </div>
                  <ChatMessages roomATag={roomATag} />
                  <WriteMessage roomATag={roomATag} />
                </>
              ) : (
                <div className="flex flex-col items-center py-2 gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setDesktopChatExpanded(true)}
                      >
                        <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Expand chat</TooltipContent>
                  </Tooltip>
                  <button
                    onClick={() => setDesktopChatExpanded(true)}
                    className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-[10px] font-medium [writing-mode:vertical-lr] rotate-180">Chat</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reaction overlay */}
        <ReactionOverlay />

        {/* Mobile: fixed bottom bar with chat handle + menu */}
        {isMobile && (
          <>
            {/* Chat handle bar - sits above menu bar */}
            <button
              onClick={() => setChatOpen(true)}
              className={cn(
                "fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-20",
                "flex items-center justify-center gap-2 py-2",
                "bg-card/95 backdrop-blur-sm border-t border-border",
              )}
            >
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Chat</span>
              <div className="h-1 w-8 rounded-full bg-muted-foreground/30 ml-1" />
            </button>

            {/* Mobile menu bar */}
            <MenuBar />

            {/* Chat drawer */}
            <Drawer open={chatOpen} onOpenChange={setChatOpen}>
              <DrawerContent className="h-[70dvh] max-h-[70dvh]">
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
    </RoomContextProvider>
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
    refetchInterval: 10_000, // Refetch every 10s to pick up edits
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
