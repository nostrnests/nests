import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import NostrParticipants from "./participants";
import { NostrEvent, NostrLink, parseNostrLink } from "@snort/system";
import { useNestsApi } from "./hooks/useNestsApi";
import Logo from "./element/logo";
import RoomCard from "./element/room-card";
import { useEventFeed } from "@snort/system-react";
import Button from "./element/button";
import Icon from "./icon";
import ChatMessages from "./element/chat-messages";
import WriteMessage from "./element/write-message";

export default function Room() {
  const location = useLocation();
  const room = location.state as {
    event: NostrEvent,
    token: string
  } | undefined;
  if (!room?.token) return <JoinRoom />;

  const link = NostrLink.fromEvent(room.event);
  const livekitUrl = room.event.tags.find(a => a[0] === "streaming" && (a[1].startsWith("ws+livekit://") || a[1].startsWith("wss+livekit://")))?.[1];
  return <div>
    <LiveKitRoom serverUrl={(livekitUrl ?? "").replace("+livekit", "")} token={room.token} connect={true} audio={true}>
      <RoomAudioRenderer />
      <div className="w-screen flex">
        <div className="w-2/3">
          <div className="px-4 py-6 flex gap-2 items-center text-[var(--highlight)]">
            <Icon name="chevron" />
            Lobby
          </div>
          <div className="flex flex-col gap-8 mx-auto w-[35rem]">
            <RoomCard event={room.event} inRoom={true} link={false} />
            <NostrParticipants />
          </div>
        </div>
        <div className="w-1/3 h-screen bg-foreground grid grid-rows-[max-content_auto_max-content]">
          <div className="px-6 py-4 text-xl font-semibold backdrop-blur-sm">
            Chat
          </div>
          <div className="overflow-y-scroll">
            <ChatMessages link={link} />
          </div>
          <div className="px-5 py-3">
            <WriteMessage link={link} />
          </div>
        </div>
      </div>
    </LiveKitRoom>
  </div>;
}

function JoinRoom() {
  const { id } = useParams();
  const api = useNestsApi();
  const link = parseNostrLink(id!)!;
  const event = useEventFeed(link);
  const navigate = useNavigate();

  async function joinRoom() {
    const { token } = await api.joinRoom(link.id);
    navigate(`/room/${link.encode()}`, {
      state: {
        event,
        token
      },
      replace: true
    })
  }

  if (!event) return;
  return <div className="w-screen h-screen flex-col flex items-center justify-center gap-[10vh]">
    <Logo />
    <RoomCard event={event} className="w-[35rem] cursor-default" link={false} />
    <Button className="px-6 py-4 w-40 text-lg" onClick={joinRoom}>
      Join
    </Button>
  </div>
}