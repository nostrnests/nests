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
import RoomPresence from "../element/presence";
import useRoomPresence, { RoomPresenceContext } from "../hooks/useRoomPresence";
import { useLogin } from "../login";
import Modal from "../element/modal";
import { useState } from "react";

export default function Room() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const [confirmGuest, setConfirmGuest] = useState(false);
  const room = location.state as
    | {
        event: NostrEvent;
        token: string;
      }
    | undefined;
  const link = room ? NostrLink.fromEvent(room.event) : undefined;
  const presence = useRoomPresence(link);
  if (!room?.token || !link) return <JoinRoom />;

  const livekitUrl = room.event.tags.find(
    (a) => a[0] === "streaming" && (a[1].startsWith("ws+livekit://") || a[1].startsWith("wss+livekit://")),
  )?.[1];
  return (
    <div>
      <LiveKitRoom
        serverUrl={(livekitUrl ?? "").replace("+livekit", "")}
        token={room.token}
        connect={true}
        audio={true}
      >
        <RoomAudioRenderer />
        <RoomPresence link={link} />
        <RoomPresenceContext.Provider value={presence}>
          <div className="w-screen flex">
            <div className="w-2/3">
              <div
                className="px-4 py-6 flex gap-2 items-center text-highlight cursor-pointer"
                onClick={() => navigate("/")}
              >
                <Icon name="chevron" />
                Lobby
              </div>
              <div className="flex flex-col gap-8 mx-auto w-[35rem]">
                <RoomCard event={room.event} inRoom={true} link={false} />
                <NostrParticipants event={room.event} />
              </div>
            </div>
            <div className="w-1/3 h-screen bg-foreground grid grid-rows-[max-content_auto_max-content]">
              <div className="px-6 py-4 text-xl font-semibold backdrop-blur-sm">Chat</div>
              <div className="overflow-y-scroll">
                <ChatMessages link={link} />
              </div>
              <div className="px-5 py-3">
                <WriteMessage link={link} />
              </div>
            </div>
          </div>
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
      <RoomCard event={event} className="w-[35rem] cursor-default" link={false} />
      <PrimaryButton className="px-6 py-4 w-40 text-lg" onClick={joinRoom}>
        Join
      </PrimaryButton>
    </div>
  );
}
