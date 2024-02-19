import { LiveKitRoom, RoomAudioRenderer, useEnsureRoom, useParticipants } from "@livekit/components-react";
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
import useRoomPresence from "../hooks/useRoomPresence";
import { useLogin } from "../login";
import Modal from "../element/modal";
import { ReactNode, useEffect, useState } from "react";
import { useRoomReactions } from "../hooks/useRoomReactions";
import classNames from "classnames";
import Flyout from "../element/flyout";
import { NostrRoomContext } from "../hooks/nostr-room-context";
import { NestsApi, RoomInfo } from "../api";
import { ApiUrl } from "../const";
import { FormattedMessage } from "react-intl";

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
  if (!room?.token || !link) return <JoinRoom />;

  const livekitUrl = room.event.tags.find(
    (a) => a[0] === "streaming" && (a[1].startsWith("ws+livekit://") || a[1].startsWith("wss+livekit://")),
  )?.[1];
  return (
    <LiveKitRoom
      serverUrl={(livekitUrl ?? "").replace("+livekit", "")}
      token={room.token}
      connect={true}
      audio={{
        autoGainControl: false,
      }}
      className="overflow-hidden"
    >
      <RoomAudioRenderer />
      <NostrRoomContextProvider link={link}>
        <div className="w-screen flex overflow-hidden h-screen">
          <ParticipantsPannel room={room} />
          <ChatPannel link={link} />
        </div>
      </NostrRoomContextProvider>
      {login.type === "none" && !confirmGuest && (
        <Modal id="join-as-guest">
          <div className="flex flex-col gap-4 items-center">
            <h2>
              <FormattedMessage defaultMessage="Join Room" />
            </h2>
            <Button className="rounded-full bg-foreground-2 w-full" onClick={() => setConfirmGuest(true)}>
              <FormattedMessage defaultMessage="Continue as Guest" />
            </Button>
            <Link to="/sign-up" className="text-highlight">
              <FormattedMessage defaultMessage="Create a nostr account" />
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
      <div className="px-4 py-6">
        <button className="flex gap-2 items-center text-highlight cursor-pointer" onClick={() => navigate("/")}>
          <Icon name="chevron" />
          <FormattedMessage defaultMessage="Lobby" />
        </button>
      </div>
      <div className="flex flex-col gap-8 mx-auto lg:w-[35rem] max-lg:px-4">
        <RoomCard event={room.event} inRoom={true} link={false} />
        <NostrParticipants event={room.event} />
      </div>
    </div>
  );
}

function ChatPannel({ link }: { link: NostrLink }) {
  const [expanded, setExpanded] = useState(false);
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
        "lg:h-screen bg-foreground grid overflow-hidden grid-rows-[max-content_auto_max-content] w-chat",
      )}
    >
      <div
        className={classNames("h-3 bg-foreground-2 w-40 rounded-full mt-2 mx-auto cursor-pointer lg:hidden", {
          "mb-3": expanded,
        })}
        onClick={() => setExpanded((s) => !s)}
      ></div>
      <div className={classNames("px-6 py-4 text-xl font-semibold backdrop-blur-sm max-lg:hidden")}>
        <FormattedMessage defaultMessage="Chat" />
      </div>
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
        <FormattedMessage defaultMessage="Join" />
      </PrimaryButton>
    </div>
  );
}

function NostrRoomContextProvider({ link, children }: { link: NostrLink; children?: ReactNode }) {
  const [flyout, setFlyout] = useState<ReactNode>();
  const [roomInfo, setRoomInfo] = useState<RoomInfo>();
  const presence = useRoomPresence(link, true);
  const reactions = useRoomReactions(link);
  const participants = useParticipants();
  const room = useEnsureRoom();

  useEffect(() => {
    const api = new NestsApi(ApiUrl);
    api.getRoomInfo(link.id).then(setRoomInfo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(participants.map((a) => a.permissions))]);

  useEffect(() => {
    if (room.metadata) {
      setRoomInfo(JSON.parse(room.metadata) as RoomInfo);
    }
  }, [room.metadata]);

  return (
    <NostrRoomContext.Provider value={{ reactions, presence, flyout, setFlyout, info: roomInfo }}>
      <Flyout show={flyout !== undefined} onClose={() => setFlyout(undefined)}>
        {flyout}
      </Flyout>
      {children}
    </NostrRoomContext.Provider>
  );
}
