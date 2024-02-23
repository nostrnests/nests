import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import NostrParticipants from "../element/participants";
import { NostrEvent, NostrLink, parseNostrLink } from "@snort/system";
import { useNestsApi } from "../hooks/useNestsApi";
import Logo from "../element/logo";
import RoomCard from "../element/room-card";
import { SnortContext, useEventFeed } from "@snort/system-react";
import { PrimaryButton, SecondaryButton } from "../element/button";
import Icon from "../icon";
import ChatMessages from "../element/chat-messages";
import WriteMessage from "../element/write-message";
import useRoomPresence, { useSendPresence } from "../hooks/useRoomPresence";
import { useLogin } from "../login";
import Modal from "../element/modal";
import { CSSProperties, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useRoomReactions } from "../hooks/useRoomReactions";
import classNames from "classnames";
import Flyout from "../element/flyout";
import { NostrRoomContext } from "../hooks/nostr-room-context";
import { RoomInfo } from "../api";
import { FormattedMessage } from "react-intl";
import { removeUndefined, sanitizeRelayUrl } from "@snort/shared";
import { updateRelays } from "../utils";

interface RoomState {
  event: NostrEvent;
  token: string;
}

const ChatWidth = 450 as const;

export default function Room() {
  const location = useLocation();
  const room = location.state as RoomState | undefined;
  const link = useMemo(() => (room ? NostrLink.fromEvent(room.event) : undefined), [room]);
  const system = useContext(SnortContext);

  useEffect(() => {
    if (room?.event) {
      const relays = removeUndefined(
        room?.event.tags
          .find((a) => a[0] === "relays")
          ?.slice(1)
          .map((a) => sanitizeRelayUrl(a)) ?? [],
      );
      if (relays.length > 0) {
        updateRelays(relays);
      }
    }
  }, [room?.event, system]);

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
    >
      <NostrRoomContextProvider event={room.event}>
        <div className="flex overflow-hidden h-[100dvh]">
          <ParticipantsPannel room={room} />
          <ChatPannel link={link} />
        </div>
      </NostrRoomContextProvider>
    </LiveKitRoom>
  );
}

function ParticipantsPannel({ room }: { room: RoomState }) {
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
        <RoomCard event={room.event} inRoom={true} link={false} showDescription={true} />
        <NostrParticipants event={room.event} />
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

  const hiddenWhenCollapsed = { "max-lg:hidden": !expanded };
  return (
    <div
      className={classNames(mobileStyles, "lg:h-[100dvh] bg-foreground overflow-hidden flex flex-col w-chat")}
      style={
        {
          ["--card-height"]: `${cardHeight}dvh`,
        } as CSSProperties
      }
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

function JoinRoom() {
  const { id } = useParams();
  const api = useNestsApi();
  const link = parseNostrLink(id!)!;
  if (link.relays) {
    updateRelays(link.relays);
  }
  const event = useEventFeed(link);
  const navigate = useNavigate();
  const location = useLocation();

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
  }, [event]);

  async function joinRoom() {
    if (!api) return;
    const { token } = await api.joinRoom(link.id);
    navigate(`/${link.encode()}`, {
      state: {
        event,
        token,
      } as RoomState,
      replace: true,
    });
  }

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const token = query.get("token");
    if (token && event) {
      navigate(location.pathname, {
        state: {
          event,
          token,
        },
        replace: true,
      });
    }
  }, [event, location, navigate]);

  if (!event)
    return (
      <h1>
        <FormattedMessage defaultMessage="Room not found" />
      </h1>
    );
  return (
    <div className="w-screen h-[100dvh] flex-col flex items-center justify-center gap-[10dvh]">
      <Logo />
      <RoomCard event={event} className="lg:w-[35rem] cursor-default" link={false} showDescription={true} />
      <PrimaryButton className="px-6 py-4 w-40 text-lg" onClick={joinRoom}>
        <FormattedMessage defaultMessage="Join" />
      </PrimaryButton>
    </div>
  );
}

function NostrRoomContextProvider({ event, children }: { event: NostrEvent; children?: ReactNode }) {
  const [flyout, setFlyout] = useState<ReactNode>();
  const [volume, setVolume] = useState(1);
  const [roomInfo, setRoomInfo] = useState<RoomInfo>();
  const [confirmGuest, setConfirmGuest] = useState(false);
  const login = useLogin();
  const link = useMemo(() => NostrLink.fromEvent(event), [event]);
  const presence = useRoomPresence(link);
  const reactions = useRoomReactions(link);
  const room = useRoomContext();
  const localParticipant = useLocalParticipant();
  const api = useNestsApi();
  useSendPresence(link);

  useEffect(() => {
    const handler = (m?: string) => {
      if (m) {
        const info = JSON.parse(m) as RoomInfo;
        console.debug("setting metadata", info);
        setRoomInfo(info);
      }
    };
    const endRecording = () => console.log("END_RECORDING");
    const handler2 = () => {
      if (room.participants.size === 0) {
        endRecording();
      }
    };

    const isRecorder = room.localParticipant.permissions?.recorder;
    room.on("roomMetadataChanged", handler);
    if (isRecorder) {
      room.on("participantDisconnected", handler2);
      room.on("disconnected", endRecording);
      console.log("START_RECORDING");
    }
    return () => {
      room.off("roomMetadataChanged", handler);
      if (isRecorder) {
        room.off("participantDisconnected", handler2);
        room.off("disconnected", endRecording);
      }
    };
  }, [room]);

  useEffect(() => {
    const endRecording = () => console.log("END_RECORDING");
    const handler2 = () => {
      if (room.participants.size === 0) {
        endRecording();
      }
    };

    const isRecorder = localParticipant.localParticipant.permissions?.recorder;
    if (isRecorder) {
      room.on("participantDisconnected", handler2);
      room.on("disconnected", endRecording);
      console.log("START_RECORDING");
    }
    return () => {
      if (isRecorder) {
        room.off("participantDisconnected", handler2);
        room.off("disconnected", endRecording);
      }
    };
  }, [room, localParticipant]);

  useEffect(() => {
    api.getRoomInfo(link.id).then((m) => {
      console.debug("setting metadata", m);
      setRoomInfo(m);
    });
  }, [link.id, api]);

  return (
    <NostrRoomContext.Provider
      value={{
        event,
        reactions,
        presence,
        flyout,
        setFlyout,
        info: roomInfo,
        volume,
        setVolume,
      }}
    >
      <RoomAudioRenderer volume={volume} />
      <Flyout show={flyout !== undefined} onClose={() => setFlyout(undefined)}>
        {flyout}
      </Flyout>
      {children}
      {login.type === "none" && !room.localParticipant.permissions?.recorder && !confirmGuest && (
        <Modal id="join-as-guest">
          <div className="flex flex-col gap-4 items-center">
            <h2>
              <FormattedMessage defaultMessage="Join Room" />
            </h2>
            <SecondaryButton className="w-full" onClick={() => setConfirmGuest(true)}>
              <FormattedMessage defaultMessage="Continue as Guest" />
            </SecondaryButton>
            <Link to="/sign-up" className="text-highlight">
              <FormattedMessage defaultMessage="Create a nostr account" />
            </Link>
          </div>
        </Modal>
      )}
    </NostrRoomContext.Provider>
  );
}
