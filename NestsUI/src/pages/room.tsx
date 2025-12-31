import { LiveKitRoom } from "@livekit/components-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import NostrParticipants from "../element/participants";
import { NostrEvent, NostrLink, RequestBuilder } from "@snort/system";
import RoomCard from "../element/room-card";
import { SnortContext, useRequestBuilder } from "@snort/system-react";
import Icon from "../icon";
import ChatMessages from "../element/chat-messages";
import WriteMessage from "../element/write-message";
import { useLogin } from "../login";
import { CSSProperties, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import classNames from "classnames";
import { FormattedMessage } from "react-intl";
import { removeUndefined, sanitizeRelayUrl } from "@snort/shared";
import { extractStreamInfo, updateRelays } from "../utils";
import { NostrRoomContextProvider } from "../element/nostr-room-context-provider";
import { JoinRoom } from "../element/join-room";
import { useNostrRoom } from "../hooks/nostr-room-context";
import { useSwipeable } from "react-swipeable";
import { useChatActivity } from "../hooks/useChatActivity";
import { useNestsApi } from "../hooks/useNestsApi";

export interface RoomState {
  event: NostrEvent;
  token: string;
}

const ChatWidth = 450 as const;

export default function Room() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const room = location.state as RoomState | undefined;
  const link = useMemo(() => (room ? NostrLink.fromEvent(room.event) : undefined), [room]);
  const system = useContext(SnortContext);

  // Track if we've already refreshed the token for this room
  const tokenRefreshedRef = useRef<string | null>(null);
  const [freshToken, setFreshToken] = useState<string | null>(null);

  // Update URL to match the canonical naddr from the event
  useEffect(() => {
    if (link && id) {
      const correctNaddr = link.encode();
      if (id !== correctNaddr) {
        navigate(`/${correctNaddr}`, {
          state: location.state,
          replace: true,
        });
      }
    }
  }, [link, id, navigate, location.state]);

  const roomSub = useMemo(() => {
    const sub = new RequestBuilder(`room:${link?.id}`);
    if (link) {
      sub.withFilter().link(link);
    }
    return sub;
  }, [link]);
  const roomUpdates = useRequestBuilder(roomSub);
  const event = roomUpdates.length > 0 ? roomUpdates[0] : room?.event;

  const { service } = extractStreamInfo(event);
  const api = useNestsApi(service);

  // Refresh token on mount to ensure we have a valid token after page reload
  const refreshToken = useCallback(async () => {
    if (!event || !link || !api) return null;

    // Only refresh once per room
    if (tokenRefreshedRef.current === event.id) return null;

    try {
      console.debug("Refreshing room token...");
      const { token } = await api.joinRoom(link.id);
      tokenRefreshedRef.current = event.id;
      setFreshToken(token);

      // Update location state with fresh token
      navigate(location.pathname, {
        state: {
          event,
          token,
        } as RoomState,
        replace: true,
      });

      return token;
    } catch (e) {
      console.error("Failed to refresh token:", e);
      return null;
    }
  }, [event, link, api, navigate, location.pathname]);

  // Refresh token when component mounts with existing state (e.g., page reload)
  useEffect(() => {
    if (room?.token && event && tokenRefreshedRef.current !== event.id) {
      refreshToken();
    }
  }, [room?.token, event, refreshToken]);

  useEffect(() => {
    if (event) {
      const relays = removeUndefined(
        event.tags
          .find((a) => a[0] === "relays")
          ?.slice(1)
          .map((a) => sanitizeRelayUrl(a)) ?? [],
      );
      if (relays.length > 0) {
        updateRelays(relays);
      }
    }
  }, [event, system]);

  // Use fresh token if available, otherwise fall back to state token
  const activeToken = freshToken ?? room?.token;

  if (!event || !activeToken || !link) return <JoinRoom />;

  const livekitUrl = event?.tags.find(
    (a) => a[0] === "streaming" && (a[1].startsWith("ws+livekit://") || a[1].startsWith("wss+livekit://")),
  )?.[1];
  const status = event?.tags.find((a) => a[0] === "status")?.[1];
  const isLive = status === "live";
  const serverUrl = (livekitUrl ?? "").replace("+livekit", "");
  // Use event.id + token as key to force LiveKitRoom to remount when switching rooms or token changes
  // This ensures the audio connection is properly established with the correct token
  const roomKey = `${event.id}-${activeToken}`;
  return (
    <LiveKitRoom key={roomKey} serverUrl={serverUrl} token={activeToken} connect={isLive}>
      <NostrRoomContextProvider event={event} token={activeToken} serverUrl={serverUrl}>
        <div className="flex overflow-hidden h-[100dvh]">
          <ParticipantsPannel event={event} />
          <ChatPannel link={link} />
        </div>
      </NostrRoomContextProvider>
    </LiveKitRoom>
  );
}

function ParticipantsPannel({ event }: { event: NostrEvent }) {
  const { setLobbyOpen } = useNostrRoom();
  return (
    <div className={`lg:w-[calc(100vw-${ChatWidth}px)] max-lg:w-screen overflow-y-auto`}>
      <div className="px-4 pt-6">
        <button
          className="flex gap-2 items-center text-highlight cursor-pointer"
          onClick={() => setLobbyOpen(true)}
        >
          <Icon name="people" />
          <FormattedMessage defaultMessage="Browse Rooms" />
        </button>
      </div>
      <div className="flex flex-col gap-8 mx-auto lg:w-[35rem] max-lg:px-4 mb-[30dvh]">
        <RoomCard event={event} inRoom={true} link={false} showDescription={true} />
        <NostrParticipants event={event} />
      </div>
    </div>
  );
}

function ChatPannel({ link }: { link: NostrLink }) {
  const [expanded, setExpanded] = useState(false);
  const login = useLogin();
  const { hasNewMessages } = useChatActivity(link, expanded);
  const cardHeight = login.type === "none" ? 40 : 85;
  const mobileStyles = [
    {
      "max-lg:translate-y-[20dvh] max-lg:h-[80dvh]": expanded,
      "max-lg:translate-y-[calc(100dvh-var(--card-height))] max-lg:h-[--card-height]": !expanded,
    },
    "max-lg:fixed",
    "max-lg:top-0",
    "max-lg:left-0",
    "max-lg:w-screen",
    "max-lg:rounded-t-3xl",
    "max-lg:transition",
  ];

  const swipeHandlers = useSwipeable({
    onSwipedUp: () => {
      setExpanded(true);
    },
    onSwipedDown: () => {
      setExpanded(false);
    },
  });

  const hiddenWhenCollapsed = { "max-lg:hidden": !expanded };
  return (
    <div
      className={classNames(mobileStyles, "lg:h-[100dvh] bg-foreground overflow-hidden flex flex-col w-chat")}
      style={
        {
          ["--card-height"]: `${cardHeight}px`,
        } as CSSProperties
      }
      {...swipeHandlers}
    >
      <div
        className={classNames(
          "h-3 min-h-3 w-40 rounded-full mt-2 mx-auto cursor-pointer lg:hidden transition-all",
          {
            "mb-3": expanded,
            "bg-primary animate-pulse": hasNewMessages && !expanded,
            "bg-foreground-2": !hasNewMessages || expanded,
          }
        )}
        onClick={() => setExpanded((s) => !s)}
      ></div>
      <div className={classNames("px-6 py-4 text-xl font-semibold backdrop-blur-sm max-lg:hidden")}>
        <FormattedMessage defaultMessage="Chat" />
      </div>
      <ChatMessages link={link} className={classNames(hiddenWhenCollapsed)} />
      <div className={classNames("px-5 lg:py-3", { "max-lg:py-2": expanded })}>
        <WriteMessage link={link} className={classNames(hiddenWhenCollapsed)} />
      </div>
    </div>
  );
}
