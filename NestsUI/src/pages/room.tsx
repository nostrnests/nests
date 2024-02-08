import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import NostrParticipants from "../element/participants";
import { NostrEvent, NostrLink, parseNostrLink } from "@snort/system";
import { useNestsApi } from "../hooks/useNestsApi";
import Logo from "../element/logo";
import RoomCard from "../element/room-card";
import { useEventFeed } from "@snort/system-react";
import Button, { PrimaryButton } from "../element/button";
import Icon from "../icon";
import ChatMessages from "../element/chat-messages";
import WriteMessage from "../element/write-message";
import useRoomPresence, { RoomPresenceContext } from "../hooks/useRoomPresence";
import { useLogin } from "../login";
import Modal from "../element/modal";
import { useState } from "react";
import { RoomReactions, useRoomReactions } from "../hooks/useRoomReactions";
import classNames from "classnames";

interface RoomState {
  event: NostrEvent;
  token: string;
}

const ChatWidth = 450 as const;

export default function Room() {
  const location = useLocation();
  const login = useLogin();
  const [confirmGuest, setConfirmGuest] = useState(false);
  const room = location.state as RoomState | undefined;
  const link = room ? NostrLink.fromEvent(room.event) : undefined;
  const presence = useRoomPresence(link, true);
  const reactions = useRoomReactions(link);
  if (!room?.token || !link) return <JoinRoom />;

  const livekitUrl = room.event.tags.find(
    (a) => a[0] === "streaming" && (a[1].startsWith("ws+livekit://") || a[1].startsWith("wss+livekit://")),
  )?.[1];
  return (
    <LiveKitRoom
      serverUrl={(livekitUrl ?? "").replace("+livekit", "")}
      token={room.token}
      connect={true}
      audio={true}
      className="overflow-hidden"
    >
      <RoomAudioRenderer />
      <RoomPresenceContext.Provider value={presence}>
        <RoomReactions.Provider value={reactions}>
          <div className="w-screen flex overflow-hidden h-screen">
            <ParticipantsPannel room={room} />
            <ChatPannel link={link} />
          </div>
        </RoomReactions.Provider>
      </RoomPresenceContext.Provider>
      {login.type === "none" && !confirmGuest && (
        <Modal id="join-as-guest">
          <div className="flex flex-col gap-4 items-center">
            <h2>Join Room</h2>
            <Button className="rounded-full bg-foreground-2 w-full" onClick={() => setConfirmGuest(true)}>
              Continue as Guest
            </Button>
            <Link to="/sign-up" className="text-highlight">
              Create a nostr account
            </Link>
          </div>
        </Modal>
      )}
    </LiveKitRoom>
  );
}

function ParticipantsPannel({ room }: { room: RoomState }) {
  const navigate = useNavigate();
  return (
    <div className={`lg:w-[calc(100vw-${ChatWidth}px)] max-lg:w-screen`}>
      <div className="px-4 py-6 flex gap-2 items-center text-highlight cursor-pointer" onClick={() => navigate("/")}>
        <Icon name="chevron" />
        Lobby
      </div>
      <div className="flex flex-col gap-8 mx-auto lg:w-[35rem] max-lg:px-4">
        <RoomCard event={room.event} inRoom={true} link={false} />
        <NostrParticipants event={room.event} />
      </div>
    </div>
  );
}

function ChatPannel({ link }: { link: NostrLink }) {
  const [expanded, setExpanded] = useState(true);
  const mobileStyles = [
    {
      "max-lg:translate-y-[20vh] max-lg:h-[80vh]": expanded,
      "max-lg:translate-y-[90vh] max-lg:h-[10vh]": !expanded,
    },
    "max-lg:absolute",
    "max-lg:left-0",
    "max-lg:w-screen",
    "max-lg:rounded-t-3xl",
    "max-lg:transition",
  ];

  const hiddenWhenCollapsed = { "max-lg:hidden": !expanded };
  return (
    <div
      className={classNames(
        mobileStyles,
        `lg:w-[${ChatWidth}px]`,
        "lg:h-screen bg-foreground grid grid-rows-[max-content_auto_max-content] overflow-hidden",
      )}
    >
      <div
        className={classNames("h-3 bg-foreground-2 w-40 rounded-full mt-2 mx-auto cursor-pointer lg:hidden", {
          "mb-3": expanded,
        })}
        onClick={() => setExpanded((s) => !s)}
      ></div>
      <div className={classNames("px-6 py-4 text-xl font-semibold backdrop-blur-sm max-lg:hidden")}>Chat</div>
      <div className={classNames("overflow-y-scroll", hiddenWhenCollapsed)}>
        <ChatMessages link={link} />
      </div>
      <div className={classNames("px-5 lg:py-3", { "max-lg:py-2": expanded })}>
        <WriteMessage link={link} className={classNames(hiddenWhenCollapsed)} />
      </div>
    </div>
  );
}

function JoinRoom() {
  const { id } = useParams();
  const api = useNestsApi();
  const link = parseNostrLink(id!)!;
  const event = useEventFeed(link);
  const navigate = useNavigate();

  async function joinRoom() {
    if (!api) return;
    const { token } = await api.joinRoom(link.id);
    navigate(`/${link.encode()}`, {
      state: {
        event,
        token,
      },
      replace: true,
    });
  }

  if (!event) return;
  return (
    <div className="w-screen h-screen flex-col flex items-center justify-center gap-[10vh]">
      <Logo />
      <RoomCard event={event} className="lg:w-[35rem] cursor-default" link={false} />
      <PrimaryButton className="px-6 py-4 w-40 text-lg" onClick={joinRoom}>
        Join
      </PrimaryButton>
    </div>
  );
}
