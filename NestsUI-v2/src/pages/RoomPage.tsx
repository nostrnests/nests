import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useSeoMeta } from "@unhead/react";
import { nip19 } from "nostr-tools";
import { useNostr } from "@nostrify/react";
import { useQuery } from "@tanstack/react-query";
import type { NostrEvent } from "@nostrify/nostrify";

import { NestTransportProvider } from "@/transport";
import { RoomContextProvider } from "@/components/RoomContextProvider";
import { ParticipantsGrid } from "@/components/ParticipantsGrid";
import { ChatMessages } from "@/components/ChatMessages";
import { WriteMessage } from "@/components/WriteMessage";
import { MenuBar } from "@/components/MenuBar";
import { RoomLobbyDrawer } from "@/components/RoomLobbyDrawer";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsAdmin } from "@/hooks/useIsAdmin";
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
  const status = getRoomStatus(event);

  return (
    <RoomContextProvider event={event}>
      <div className="flex flex-col h-screen bg-background">
        {/* Room header card */}
        <div className={cn("p-4 shrink-0", color)}>
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h1 className="text-white font-semibold text-lg truncate">{title}</h1>
                {summary && (
                  <p className="text-white/60 text-sm truncate mt-0.5">{summary}</p>
                )}
              </div>
              {status === "live" && (
                <span className="shrink-0 ml-3 px-2 py-0.5 rounded text-xs font-medium bg-red-500/90 text-white">
                  LIVE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Main content: two-panel layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Participants panel */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto">
              <ParticipantsGrid />
            </div>
          </div>

          {/* Chat panel */}
          <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-border flex flex-col h-64 md:h-auto">
            <div className="px-4 py-2 border-b border-border shrink-0">
              <h3 className="text-sm font-medium text-muted-foreground">Chat</h3>
            </div>
            <ChatMessages roomATag={roomATag} />
            <WriteMessage roomATag={roomATag} />
          </div>
        </div>

        {/* Bottom menu bar */}
        <MenuBar />

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

  // Fetch event if not in state
  const { data: fetchedEvent, isLoading } = useQuery({
    queryKey: ["nostr", "room-event", decoded?.kind, decoded?.pubkey, decoded?.identifier],
    queryFn: async () => {
      if (!decoded) return null;
      const events = await nostr.query(
        [{
          kinds: [decoded.kind],
          authors: [decoded.pubkey],
          "#d": [decoded.identifier],
          limit: 1,
        }],
        { signal: AbortSignal.timeout(5000) },
      );
      return events[0] ?? null;
    },
    enabled: !stateEvent && !!decoded,
  });

  const event = stateEvent ?? fetchedEvent;

  useSeoMeta({
    title: event ? `${getRoomTitle(event)} - Nests` : "Room - Nests",
    description: event ? getRoomSummary(event) : "Audio room on Nests",
  });

  if (!decoded && !stateEvent) {
    return <NotFound />;
  }

  if (isLoading && !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
