import { LiveKitRoom } from "@livekit/components-react";
import { useLocation, useNavigate } from "react-router-dom";
import NostrParticipants from "../element/participants";
import { NostrEvent, NostrLink, RequestBuilder } from "@snort/system";
import RoomCard from "../element/room-card";
import { SnortContext, useRequestBuilder } from "@snort/system-react";
import Icon from "../icon";
import ChatMessages from "../element/chat-messages";
import WriteMessage from "../element/write-message";
import { useLogin } from "../login";
import { CSSProperties, useContext, useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import { FormattedMessage } from "react-intl";
import { removeUndefined, sanitizeRelayUrl } from "@snort/shared";
import { updateRelays } from "../utils";
import { NostrRoomContextProvider } from "../element/nostr-room-context-provider";
import { JoinRoom } from "../element/join-room";
import { useSwipeable } from "react-swipeable";

export interface RoomState {
  event: NostrEvent;
  token: string;
}

const ChatWidth = 450 as const;

export default function Room() {
  const location = useLocation();
  const room = location.state as RoomState | undefined;
  const link = useMemo(() => (room ? NostrLink.fromEvent(room.event) : undefined), [room]);
  const system = useContext(SnortContext);

  const roomSub = useMemo(() => {
    const sub = new RequestBuilder(`room:${link?.id}`);
    if (link) {
      sub.withFilter().link(link);
    }
    return sub;
  }, [link]);
  const roomUpdates = useRequestBuilder(roomSub);
  const event = roomUpdates.length > 0 ? roomUpdates[0] : room?.event;

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

  if (!event || !room?.token || !link) return <JoinRoom />;

  const livekitUrl = event?.tags.find(
    (a) => a[0] === "streaming" && (a[1].startsWith("ws+livekit://") || a[1].startsWith("wss+livekit://")),
  )?.[1];
  const status = event?.tags.find((a) => a[0] === "status")?.[1];
  const isLive = status === "live";
  return (
    <LiveKitRoom serverUrl={(livekitUrl ?? "").replace("+livekit", "")} token={room.token} connect={isLive}>
      <NostrRoomContextProvider event={event} token={room.token}>
        <div className="flex overflow-hidden h-[100dvh]">
          <ParticipantsPannel event={event} />
          <ChatPannel link={link} />
        </div>
      </NostrRoomContextProvider>
    </LiveKitRoom>
  );
}

function ParticipantsPannel({ event }: { event: NostrEvent }) {
  const navigate = useNavigate();
  return (
    <div className={`lg:w-[calc(100vw-${ChatWidth}px)] max-lg:w-screen overflow-y-auto`}>
      <div className="px-4 pt-6">
        <button className="flex gap-2 items-center text-highlight cursor-pointer" onClick={() => navigate("/")}>
          <Icon name="chevron" />
          <FormattedMessage defaultMessage="Lobby" />
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
  const cardHeight = login.type === "none" ? 4 : 10;
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
          ["--card-height"]: `${cardHeight}dvh`,
        } as CSSProperties
      }
      {...swipeHandlers}
    >
      <div
        className={classNames("h-3 min-h-3 bg-foreground-2 w-40 rounded-full mt-2 mx-auto cursor-pointer lg:hidden", {
          "mb-3": expanded,
        })}
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
