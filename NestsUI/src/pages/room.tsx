import { useLocation, useNavigate, useParams } from "react-router-dom";
import NostrParticipants from "../element/participants";
import { NostrEvent, NostrLink, PrivateKeySigner, RequestBuilder } from "@snort/system";
import RoomCard from "../element/room-card";
import { SnortContext, useRequestBuilder } from "@snort/system-react";
import Icon from "../icon";
import ChatMessages from "../element/chat-messages";
import WriteMessage from "../element/write-message";
import { useLogin } from "../login";
import { CSSProperties, useContext, useEffect, useMemo, useRef, useState } from "react";
import classNames from "classnames";
import { FormattedMessage } from "react-intl";
import { removeUndefined, sanitizeRelayUrl } from "@snort/shared";
import { NostrRoomContextProvider } from "../element/nostr-room-context-provider";
import { JoinRoom } from "../element/join-room";
import { useNostrRoom } from "../hooks/nostr-room-context";
import { useSwipeable } from "react-swipeable";
import { useChatActivity } from "../hooks/useChatActivity";
import { NestTransportProvider, authenticateWithMoqRelay, type TransportConfig } from "../transport";
import { DefaultMoQAuthUrl, DefaultMoQServers, ParticipantRole } from "../const";

export interface RoomState {
  event: NostrEvent;
}

const ChatWidth = 450 as const;

export default function Room() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const room = location.state as RoomState | undefined;
  const link = useMemo(() => (room ? NostrLink.fromEvent(room.event) : undefined), [room]);
  const system = useContext(SnortContext);
  const login = useLogin();

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
  // Prefer the event with the latest created_at timestamp to handle room restarts
  const event = useMemo(() => {
    const subscriptionEvent = roomUpdates.length > 0 ? roomUpdates[0] : undefined;
    const stateEvent = room?.event;
    if (!subscriptionEvent) return stateEvent;
    if (!stateEvent) return subscriptionEvent;
    return stateEvent.created_at > subscriptionEvent.created_at ? stateEvent : subscriptionEvent;
  }, [roomUpdates, room?.event]);

  useEffect(() => {
    if (event) {
      const relays = removeUndefined(
        event.tags
          .find((a) => a[0] === "relays")
          ?.slice(1)
          .map((a) => sanitizeRelayUrl(a)) ?? [],
      );
      if (relays.length > 0) {
        // TODO: updateRelays if needed
      }
    }
  }, [event, system]);

  // Extract room info from event (safe even when event is undefined)
  const streamingUrl = event?.tags.find((a) => a[0] === "streaming")?.[1];
  const authTagUrl = event?.tags.find((a) => a[0] === "auth")?.[1];
  const status = event?.tags.find((a) => a[0] === "status")?.[1];
  const isLive = status === "live";

  const serverUrl = streamingUrl || DefaultMoQServers[0];
  const authUrl = authTagUrl || DefaultMoQAuthUrl;

  const roomNamespace = event && link
    ? `nests/30312:${event.pubkey}:${link.id}`
    : null;

  const userPubkey = login.pubkey ?? "";
  const isHost = event ? event.pubkey === userPubkey : false;
  const userRole = event?.tags.find(
    (t) => t[0] === "p" && t[1] === userPubkey,
  )?.[3];
  const canPublish =
    isHost ||
    userRole === ParticipantRole.ADMIN ||
    userRole === ParticipantRole.SPEAKER;

  // Authenticate with moq-auth to get a JWT token
  const [moqToken, setMoqToken] = useState<string | null>(null);
  const guestSignerRef = useRef<PrivateKeySigner | null>(null);

  useEffect(() => {
    if (!isLive || !serverUrl || !roomNamespace) return;

    let signer = login.signer;
    if (!signer) {
      if (!guestSignerRef.current) {
        guestSignerRef.current = PrivateKeySigner.random();
      }
      signer = guestSignerRef.current;
    }

    const doAuth = () => {
      authenticateWithMoqRelay(authUrl, signer!, roomNamespace, canPublish)
        .then((token) => {
          console.log("[transport] got MoQ auth token");
          setMoqToken(token);
        })
        .catch((e) => {
          console.error("[transport] MoQ auth failed:", e);
        });
    };

    doAuth();
    const refreshInterval = setInterval(doAuth, 8 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [isLive, serverUrl, authUrl, roomNamespace, canPublish, login.signer]);

  // Build transport config (only when we have a token)
  const certFingerprint = import.meta.env.VITE_MOQ_CERT_FINGERPRINT || undefined;
  const transportConfig: TransportConfig | null =
    isLive && serverUrl && moqToken && roomNamespace
      ? {
          serverUrl,
          authUrl,
          roomNamespace,
          identity: userPubkey,
          canPublish,
          token: moqToken,
          certFingerprint,
        }
      : null;

  const roomKey = event ? `${event.id}-${serverUrl}-${moqToken ? "authed" : "pending"}` : "loading";

  // --- Early return AFTER all hooks ---
  if (!event || !link) return <JoinRoom />;

  return (
    <NestTransportProvider key={roomKey} config={transportConfig} connect={isLive}>
      <NostrRoomContextProvider event={event}>
        <div className="flex overflow-hidden h-[100dvh]">
          <ParticipantsPannel event={event} />
          <ChatPannel link={link} />
        </div>
      </NostrRoomContextProvider>
    </NestTransportProvider>
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
          },
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
